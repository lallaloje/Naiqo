import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { generateAuthenticationOptions } from "npm:@simplewebauthn/server@13.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const rpId        = Deno.env.get("WEBAUTHN_RP_ID") || "naiqo.es";

    const admin = createClient(supabaseUrl, serviceKey);

    // Discoverable mode: no allowCredentials needed
    // iOS will show all passkeys for this rpID automatically
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: "required",
      timeout: 60000,
    });

    // Store challenge without email (we'll get user from userHandle after auth)
    const { data: challengeRow, error: chalErr } = await admin
      .from("webauthn_challenges")
      .insert({ email: "discoverable", challenge: options.challenge, type: "authentication" })
      .select("id").single();

    if (chalErr) throw new Error(chalErr.message);

    return new Response(
      JSON.stringify({ options, challenge_id: challengeRow.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    console.error("login-start error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
