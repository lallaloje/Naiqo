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

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error('sessionId requerido');

    // 1. Obtener la sesión de Stripe
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    const session = await stripeRes.json();
    if (!stripeRes.ok) throw new Error(session.error?.message || 'Error verificando sesión');

    // 2. Obtener el SetupIntent para conseguir el payment_method_id
    const setupIntentId = session.setup_intent;
    let paymentMethodId: string | null = null;
    let customerId: string | null = session.customer || null;

    if (setupIntentId) {
      const siRes = await fetch(`https://api.stripe.com/v1/setup_intents/${setupIntentId}`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      });
      const si = await siRes.json();
      if (siRes.ok) {
        paymentMethodId = si.payment_method || null;
        if (!customerId) customerId = si.customer || null;
      }
    }

    const meta = session.metadata;
    const supabase = createClient(supabaseUrl, supabaseService);

    // 3. Idempotencia — evitar crear la cita dos veces
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existing) {
      return new Response(JSON.stringify({
        success: true, alreadyCreated: true,
        appointment: { id: existing.id },
        client_name:  meta.client_name,
        service_name: meta.service_name,
        start_time:   meta.start_time,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Crear la cita — estado "pending" (la profesional la confirma)
    const { data: apt, error: insertError } = await supabase
      .from('appointments')
      .insert({
        salon_id:                 meta.salon_id,
        user_id:                  meta.user_id,
        service_id:               meta.service_id,
        client_name:              meta.client_name,
        client_email:             meta.client_email  || null,
        client_phone:             meta.client_phone  || null,
        start_time:               meta.start_time,
        end_time:                 meta.end_time,
        notes:                    meta.notes         || null,
        status:                   'pending',
        source:                   'online',
        stripe_session_id:        sessionId,
        stripe_customer_id:       customerId,
        stripe_payment_method_id: paymentMethodId,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    // 5. Push notification al salón
    const dt   = new Date(meta.start_time);
    const date = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const time = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${supabaseService}`,
        },
        body: JSON.stringify({
          user_id: meta.user_id,
          title:   '💅 Nueva reserva online',
          body:    `${meta.client_name} · ${meta.service_name} · ${date} a las ${time}`,
          url:     '/gestion-citas',
        }),
      });
    } catch (pushErr) {
      console.error('Push error (non-fatal):', pushErr);
    }

    return new Response(JSON.stringify({
      success:      true,
      appointment:  apt,
      client_name:  meta.client_name,
      service_name: meta.service_name,
      start_time:   meta.start_time,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error confirm-setup-booking:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
