import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts['t'];
  const sig = parts['v1'];
  if (!timestamp || !sig) return false;

  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Reject events older than 5 minutes
  const eventTime = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - eventTime) > 300) return false;

  return computedSig === sig;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no configurada');
    return new Response('Webhook secret missing', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const body = await req.text();

  const valid = await verifyStripeSignature(body, signature, webhookSecret);
  if (!valid) return new Response('Invalid signature', { status: 400 });

  const event = JSON.parse(body);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;

        const userId  = session.metadata?.user_id;
        const planId  = session.metadata?.plan_id;
        const billing = session.metadata?.billing;
        if (!userId) break;

        await supabase
          .from('salons')
          .update({
            subscription_status: 'active',
            subscription_plan: planId,
            subscription_billing: billing,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          })
          .eq('user_id', userId);

        console.log(`Suscripción activada: user=${userId} plan=${planId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (!userId) break;

        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : sub.status === 'canceled' ? 'expired'
          : sub.status;

        await supabase
          .from('salons')
          .update({ subscription_status: status })
          .eq('user_id', userId);

        console.log(`Suscripción actualizada: user=${userId} status=${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (!userId) break;

        await supabase
          .from('salons')
          .update({ subscription_status: 'expired' })
          .eq('user_id', userId);

        console.log(`Suscripción cancelada: user=${userId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (!customerId) break;

        await supabase
          .from('salons')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId);

        console.log(`Pago fallido para customer=${customerId}`);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error procesando webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500 }
    );
  }
});
