import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey    = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY no configurada');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      salonId, serviceId, serviceName, servicePrice,
      buyerName, buyerEmail,
      recipientName, recipientEmail, message,
      origin,
    } = await req.json();

    if (!salonId || !serviceId || !serviceName || !servicePrice || !recipientName || !recipientEmail || !buyerEmail)
      throw new Error('Faltan datos obligatorios');

    // Generar código único de 8 caracteres
    const code = Array.from(crypto.getRandomValues(new Uint8Array(5)))
      .map(b => b.toString(36).toUpperCase().padStart(2, '0'))
      .join('').slice(0, 8);

    const priceCents = Math.round(servicePrice * 100);

    const successUrl = `${origin}/cliente/regalo/exito?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${origin}/cliente/regalo`;

    const params = new URLSearchParams({
      'mode':                                            'payment',
      'payment_method_types[]':                          'card',
      'success_url':                                     successUrl,
      'cancel_url':                                      cancelUrl,
      'customer_email':                                  buyerEmail,
      'line_items[0][quantity]':                         '1',
      'line_items[0][price_data][currency]':             'eur',
      'line_items[0][price_data][unit_amount]':          String(priceCents),
      'line_items[0][price_data][product_data][name]':   `Tarjeta regalo: ${serviceName}`,
      'line_items[0][price_data][product_data][description]': `Para ${recipientName}`,
      'metadata[type]':           'gift_card',
      'metadata[code]':           code,
      'metadata[salon_id]':       salonId,
      'metadata[service_id]':     serviceId,
      'metadata[service_name]':   serviceName,
      'metadata[price_cents]':    String(priceCents),
      'metadata[buyer_name]':     buyerName || '',
      'metadata[buyer_email]':    buyerEmail,
      'metadata[recipient_name]': recipientName,
      'metadata[recipient_email]':recipientEmail,
      'metadata[message]':        message || '',
    });

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
    console.error('create-gift-card-checkout error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
