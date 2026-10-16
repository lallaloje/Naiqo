import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Price IDs configured in Stripe Dashboard
const PRICE_IDS: Record<string, Record<string, string>> = {
  basico: {
    monthly: Deno.env.get('STRIPE_PRICE_BASICO_MONTHLY') || '',
    annual:  Deno.env.get('STRIPE_PRICE_BASICO_ANNUAL')  || '',
  },
  profesional: {
    monthly: Deno.env.get('STRIPE_PRICE_PROFESIONAL_MONTHLY') || '',
    annual:  Deno.env.get('STRIPE_PRICE_PROFESIONAL_ANNUAL')  || '',
  },
  premium: {
    monthly: Deno.env.get('STRIPE_PRICE_PREMIUM_MONTHLY') || '',
    annual:  Deno.env.get('STRIPE_PRICE_PREMIUM_ANNUAL')  || '',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY no configurada');

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No autorizado');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('No autorizado');

    const { planId, billing } = await req.json();
    const billingCycle: 'monthly' | 'annual' = billing === 'annual' ? 'annual' : 'monthly';

    const priceId = PRICE_IDS[planId]?.[billingCycle];
    if (!priceId) throw new Error(`Price ID no configurado para ${planId}/${billingCycle}`);

    // Get salon data
    const { data: salon } = await supabase
      .from('salons')
      .select('id, salon_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const origin = req.headers.get('origin') || 'https://naiqo.com';

    const params = new URLSearchParams({
      'mode': 'subscription',
      'payment_method_types[]': 'card',
      'success_url': `${origin}/dashboard?checkout=success&plan=${planId}`,
      'cancel_url':  `${origin}/planes`,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'customer_email': user.email ?? '',
      'metadata[user_id]':  user.id,
      'metadata[salon_id]': salon?.id ?? '',
      'metadata[plan_id]':  planId,
      'metadata[billing]':  billingCycle,
      'subscription_data[metadata][user_id]':  user.id,
      'subscription_data[metadata][salon_id]': salon?.id ?? '',
      'subscription_data[metadata][plan_id]':  planId,
    });

    // Allow promotion codes
    params.set('allow_promotion_codes', 'true');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${stripeKey}`,
        'Content-Type':   'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) throw new Error(session.error?.message || 'Error de Stripe');

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error create-checkout:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
