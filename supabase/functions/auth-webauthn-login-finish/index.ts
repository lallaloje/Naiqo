import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { verifyAuthenticationResponse } from "npm:@simplewebauthn/server@13.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fromBase64Url(b64: string): Uint8Array {
  return Uint8Array.from(
    atob(b64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const rpId        = Deno.env.get("WEBAUTHN_RP_ID") || "naiqo.es";
    const originEnv   = Deno.env.get("WEBAUTHN_ORIGIN") || "https://naiqo.es";
    const reqOrigin   = req.headers.get("origin") || originEnv;
    const origin      = [originEnv, "https://www.naiqo.es", reqOrigin].filter(Boolean);

    const { assertion, challenge_id } = await req.json();
    if (!assertion || !challenge_id) throw new Error("Datos incompletos");

    const admin = createClient(supabaseUrl, serviceKey);

    // Get challenge
    const { data: challengeRow } = await admin.from("webauthn_challenges").select("*")
      .eq("id", challenge_id).eq("type", "authentication")
      .gt("expires_at", new Date().toISOString()).maybeSingle();
    if (!challengeRow) throw new Error("Challenge inválido o expirado");

    // Find credential by ID from assertion
    const { data: credential } = await admin.from("webauthn_credentials").select("*")
      .eq("credential_id", assertion.id).maybeSingle();
    if (!credential) throw new Error("Credencial no encontrada");

    // Verify assertion
    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      credential: {
        id:        fromBase64Url(credential.credential_id),
        publicKey: fromBase64Url(credential.public_key),
        counter:   credential.counter,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) throw new Error("Verificación biométrica fallida");

    // Update counter
    await admin.from("webauthn_credentials").update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    }).eq("id", credential.id);

    // Get user email from credential's user_id
    const { data: authUserData, error: userErr } = await admin.auth.admin.getUserById(credential.user_id);
    if (userErr || !authUserData?.user?.email) throw new Error("Usuario no encontrado");

    // Generate session token
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authUserData.user.email,
    });
    if (linkError) throw new Error(linkError.message);

    const token_hash = (linkData as any).properties?.hashed_token;
    if (!token_hash) throw new Error("No se pudo generar el token");

    await admin.from("webauthn_challenges").delete().eq("id", challenge_id);

    return new Response(JSON.stringify({ token_hash }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    console.error("login-finish error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
