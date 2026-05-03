import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
// @ts-ignore
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const vapidPublic   = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivate  = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject  = Deno.env.get('VAPID_SUBJECT')!;
    const supabaseUrl   = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const { user_id, client_email, title, body, url } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    if (user_id)      query = query.eq('user_id', user_id);
    if (client_email) query = query.eq('client_email', client_email);

    const { data: subs } = await query;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({ title, body, url: url || '/' });
    let sent = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        // If subscription is expired/invalid, delete it
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        console.error('Push error:', err.message);
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('send-push error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
