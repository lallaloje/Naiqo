import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey       = Deno.env.get('STRIPE_SECRET_KEY')!;
    const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { appointmentId } = await req.json();
    if (!appointmentId) throw new Error('appointmentId requerido');

    const supabase = createClient(supabaseUrl, supabaseService);

    // 1. Obtener la cita con datos del servicio
    const { data: apt, error } = await supabase
      .from('appointments')
      .select('*, services(price, name)')
      .eq('id', appointmentId)
      .single();

    if (error || !apt) throw new Error('Cita no encontrada');
    if ((apt as any).cancellation_charged) throw new Error('La penalización ya fue cobrada anteriormente');
    if (!(apt as any).stripe_payment_method_id) throw new Error('Esta cita no tiene tarjeta guardada');
    if (!(apt as any).stripe_customer_id) throw new Error('No se encontró el cliente de Stripe');

    const servicePrice: number = (apt as any).services?.price || 0;
    if (servicePrice <= 0) throw new Error('El servicio no tiene precio configurado');

    const amountCents = Math.round(servicePrice * 100 * 0.5); // 50%
    if (amountCents < 50) throw new Error('El importe mínimo de cobro es 0,50€');

    // 2. Crear PaymentIntent off-session y confirmarlo inmediatamente
    const params = new URLSearchParams({
      'amount':               String(amountCents),
      'currency':             'eur',
      'customer':             (apt as any).stripe_customer_id,
      'payment_method':       (apt as any).stripe_payment_method_id,
      'confirmation_method':  'automatic',
      'confirm':              'true',
      'off_session':          'true',
      'description':          `Penalización cancelación/no-show: ${(apt as any).services?.name || 'servicio'} — ${apt.client_name}`,
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const pi = await stripeRes.json();

    if (!stripeRes.ok) throw new Error(pi.error?.message || 'Error al procesar el cobro');
    if (pi.status !== 'succeeded') {
      throw new Error(`El cobro no se completó. Estado: ${pi.status}. Puede que la tarjeta requiera autenticación adicional.`);
    }

    // 3. Marcar la cita como penalización cobrada
    await supabase
      .from('appointments')
      .update({
        cancellation_charged:    true,
        cancellation_charge_id:  pi.id,
      })
      .eq('id', appointmentId);

    return new Response(JSON.stringify({
      success:       true,
      amount_euros:  (amountCents / 100).toFixed(2),
      charge_id:     pi.id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error charge-cancellation:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
