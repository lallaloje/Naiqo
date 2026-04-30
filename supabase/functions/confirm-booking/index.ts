import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey      = Deno.env.get('STRIPE_SECRET_KEY')!;
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error('sessionId requerido');

    // 1. Verificar el pago con Stripe
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    const session = await stripeRes.json();
    if (!stripeRes.ok) throw new Error(session.error?.message || 'Error verificando pago');

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ paid: false, error: 'El pago no se ha completado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const meta = session.metadata;

    // 2. Comprobar que la cita no se ha creado ya (idempotencia)
    const supabase = createClient(supabaseUrl, supabaseService);
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existing) {
      // Ya fue creada, devolver datos
      return new Response(JSON.stringify({
        paid: true, alreadyCreated: true,
        appointment: { id: existing.id },
        client_name: meta.client_name,
        service_name: meta.service_name,
        start_time: meta.start_time,
        deposit_euros: (parseInt(meta.deposit_cents) / 100).toFixed(2),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Crear la cita en Supabase
    const { data: apt, error: insertError } = await supabase
      .from('appointments')
      .insert({
        salon_id:          meta.salon_id,
        user_id:           meta.user_id,
        service_id:        meta.service_id,
        client_name:       meta.client_name,
        client_email:      meta.client_email || null,
        client_phone:      meta.client_phone || null,
        start_time:        meta.start_time,
        end_time:          meta.end_time,
        notes:             meta.notes || null,
        status:            'confirmed',   // pagada = confirmada automáticamente
        source:            'online',
        stripe_session_id: sessionId,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return new Response(JSON.stringify({
      paid: true,
      appointment: apt,
      client_name:   meta.client_name,
      service_name:  meta.service_name,
      start_time:    meta.start_time,
      deposit_euros: (parseInt(meta.deposit_cents) / 100).toFixed(2),
      remaining_euros: ((parseInt(meta.full_price_cents) - parseInt(meta.deposit_cents)) / 100).toFixed(2),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error confirm-booking:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
