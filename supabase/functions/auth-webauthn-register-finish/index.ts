import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { verifyRegistrationResponse } from "npm:@simplewebauthn/server@13.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
    const rpId        = Deno.env.get("WEBAUTHN_RP_ID") || "naiqo.es";
    const originEnv   = Deno.env.get("WEBAUTHN_ORIGIN") || "https://naiqo.es";
    // Accept both www and non-www, plus any Vercel preview URLs
    const reqOrigin   = req.headers.get("origin") || originEnv;
    const origin      = [originEnv, "https://www.naiqo.es", reqOrigin].filter(Boolean);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("No autorizado");

    const { attestation, challenge_id, device_name } = await req.json();
    if (!attestation || !challenge_id) throw new Error("Datos incompletos");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: challengeRow, error: chalErr } = await admin
      .from("webauthn_challenges").select("*")
      .eq("id", challenge_id).eq("email", user.email!).eq("type", "registration")
      .gt("expires_at", new Date().toISOString()).maybeSingle();

    if (chalErr || !challengeRow) throw new Error("Challenge inválido o expirado");

    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Verificación biométrica fallida");
    }

    // v13 API: registrationInfo.credential
    const { credential } = verification.registrationInfo;
    // Use the ID exactly as the browser sent it (already base64url) to ensure
    // it matches assertion.id during authentication
    const credentialIdB64 = attestation.id;
    const publicKeyB64    = toBase64Url(credential.publicKey);

    const { error: insertErr } = await admin.from("webauthn_credentials").upsert({
      user_id:       user.id,
      credential_id: credentialIdB64,
      public_key:    publicKeyB64,
      counter:       credential.counter,
      device_name:   device_name || "Dispositivo",
    }, { onConflict: "credential_id" });

    if (insertErr) throw new Error(insertErr.message);

    await admin.from("webauthn_challenges").delete().eq("id", challenge_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    console.error("register-finish error:", msg);
    // Return 200 so the client can read the actual error message
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
