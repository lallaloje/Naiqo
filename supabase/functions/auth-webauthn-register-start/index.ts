// auth-webauthn-register-start: generates registration options for WebAuthn
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// @ts-ignore
import { generateRegistrationOptions } from "https://esm.sh/@simplewebauthn/server@9.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
    const rpId        = Deno.env.get("WEBAUTHN_RP_ID") || "naiqo.es";

    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("No autorizado");

    const { device_name } = await req.json().catch(() => ({}));

    const admin = createClient(supabaseUrl, serviceKey);

    // Get existing credentials to exclude them
    const { data: existingCreds } = await admin
      .from("webauthn_credentials")
      .select("credential_id")
      .eq("user_id", user.id);

    const excludeCredentials = (existingCreds || []).map((c: any) => ({
      id: c.credential_id,
      type: "public-key" as const,
    }));

    const options = await generateRegistrationOptions({
      rpName: "Naiqo",
      rpID: rpId,
      userID: new TextEncoder().encode(user.id),
      userName: user.email || user.id,
      userDisplayName: user.email || "Usuario Naiqo",
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      timeout: 60000,
    });

    // Store challenge in DB (expires in 5 min)
    const { data: challengeRow, error: chalErr } = await admin
      .from("webauthn_challenges")
      .insert({ email: user.email!, challenge: options.challenge, type: "registration" })
      .select("id")
      .single();

    if (chalErr) throw new Error(chalErr.message);

    return new Response(
      JSON.stringify({ options, challenge_id: challengeRow.id, device_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("auth-webauthn-register-start error:", err);
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
