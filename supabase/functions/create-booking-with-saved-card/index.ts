import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase        = createClient(supabaseUrl, supabaseService);

    const {
      salonId, userId, serviceId, serviceName, servicePrice,
      clientName, clientEmail, clientPhone,
      startTime, endTime, notes,
      stripeCustomerId, stripePaymentMethodId,
      localDate, localTime,
    } = await req.json();

    // Crear la cita directamente (tarjeta ya validada por check-saved-card)
    const { data: apt, error } = await supabase
      .from('appointments')
      .insert({
        salon_id:                 salonId,
        user_id:                  userId,
        service_id:               serviceId,
        client_name:              clientName,
        client_email:             clientEmail  || null,
        client_phone:             clientPhone  || null,
        start_time:               startTime,
        end_time:                 endTime,
        notes:                    notes        || null,
        status:                   'confirmed',
        source:                   'online',
        stripe_customer_id:       stripeCustomerId,
        stripe_payment_method_id: stripePaymentMethodId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Push al salón
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseService}` },
        body: JSON.stringify({
          user_id: userId,
          title:   '💅 Nueva reserva online',
          body:    `${clientName} · ${serviceName} · ${localDate} a las ${localTime}`,
          url:     '/gestion-citas',
        }),
      });
    } catch (pushErr) {
      console.error('Push error (non-fatal):', pushErr);
    }

    return new Response(JSON.stringify({ success: true, appointment: apt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('create-booking-with-saved-card error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
