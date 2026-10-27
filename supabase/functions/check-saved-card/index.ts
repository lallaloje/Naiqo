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
    const supabase        = createClient(supabaseUrl, supabaseService);

    const { clientEmail, clientPhone } = await req.json();
    if (!clientEmail && !clientPhone) {
      return new Response(JSON.stringify({ saved: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar tarjeta guardada por email o teléfono
    let row: any = null;
    if (clientEmail) {
      const { data } = await supabase
        .from('client_payment_methods')
        .select('*')
        .ilike('client_email', clientEmail)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      row = data;
    }
    if (!row && clientPhone) {
      const normalized = clientPhone.replace(/[\s\-()]/g, '');
      const { data } = await supabase
        .from('client_payment_methods')
        .select('*')
        .ilike('client_phone', `%${normalized}%`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      row = data;
    }

    if (!row) {
      return new Response(JSON.stringify({ saved: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar que la tarjeta sigue siendo válida en Stripe
    const pmRes = await fetch(
      `https://api.stripe.com/v1/payment_methods/${row.stripe_payment_method_id}`,
      { headers: { 'Authorization': `Bearer ${stripeKey}` } }
    );
    if (!pmRes.ok) {
      // Tarjeta ya no existe, limpiar y responder sin tarjeta guardada
      await supabase.from('client_payment_methods').delete().eq('id', row.id);
      return new Response(JSON.stringify({ saved: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      saved:                   true,
      stripe_customer_id:      row.stripe_customer_id,
      stripe_payment_method_id: row.stripe_payment_method_id,
      card_brand:              row.card_brand,
      card_last4:              row.card_last4,
      card_exp_month:          row.card_exp_month,
      card_exp_year:           row.card_exp_year,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('check-saved-card error:', err);
    return new Response(JSON.stringify({ saved: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
