import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY no configurada');

    const {
      salonId, userId, serviceId, serviceName, servicePrice,
      clientName, clientEmail, clientPhone,
      startTime, endTime, notes, origin
    } = await req.json();

    // Calcular señal: 50% del precio, mínimo 1€
    const fullPriceCents = Math.round((servicePrice || 20) * 100);
    const depositCents   = Math.max(Math.round(fullPriceCents * 0.5), 100); // mín 1€
    const depositEuros   = (depositCents / 100).toFixed(2);
    const remainingEuros = ((fullPriceCents - depositCents) / 100).toFixed(2);

    const successUrl = `${origin}/reservar/exito?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${origin}/reservar/${salonId}`;

    // Crear sesión de pago en Stripe
    const params = new URLSearchParams({
      'mode': 'payment',
      'payment_method_types[]': 'card',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(depositCents),
      'line_items[0][price_data][product_data][name]': `Señal: ${serviceName}`,
      'line_items[0][price_data][product_data][description]':
        `50% de señal para tu cita. Pagarás €${remainingEuros} restantes en el salón.`,
      // Metadata para crear la cita después del pago
      'metadata[salon_id]': salonId,
      'metadata[user_id]': userId,
      'metadata[service_id]': serviceId,
      'metadata[service_name]': serviceName,
      'metadata[client_name]': clientName,
      'metadata[client_email]': clientEmail || '',
      'metadata[client_phone]': clientPhone || '',
      'metadata[start_time]': startTime,
      'metadata[end_time]': endTime,
      'metadata[notes]': notes || '',
      'metadata[deposit_cents]': String(depositCents),
      'metadata[full_price_cents]': String(fullPriceCents),
    });

    if (clientEmail) params.set('customer_email', clientEmail);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) throw new Error(session.error?.message || 'Error de Stripe');

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error create-booking-checkout:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
