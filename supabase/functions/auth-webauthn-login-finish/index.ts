// auth-webauthn-login-finish: verifies assertion and returns session token
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// @ts-ignore
import { verifyAuthenticationResponse } from "https://esm.sh/@simplewebauthn/server@9.0.3";

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
    const origin      = Deno.env.get("WEBAUTHN_ORIGIN") || "https://naiqo.es";

    const { assertion, challenge_id, email } = await req.json();
    if (!assertion || !challenge_id || !email) throw new Error("Datos incompletos");

    const admin = createClient(supabaseUrl, serviceKey);

    // Find auth email via salons table
    const { data: salon } = await admin
      .from("salons")
      .select("user_id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    const userId = salon?.user_id;
    const { data: authUserData } = userId
      ? await admin.auth.admin.getUserById(userId)
      : { data: null };
    const authEmail = authUserData?.user?.email || email;

    // Get and validate challenge
    const { data: challengeRow, error: chalErr } = await admin
      .from("webauthn_challenges")
      .select("*")
      .eq("id", challenge_id)
      .eq("email", authEmail)
      .eq("type", "authentication")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (chalErr || !challengeRow) throw new Error("Challenge inválido o expirado");

    // Get credential from DB
    const credentialId = assertion.id;
    const { data: credential, error: credErr } = await admin
      .from("webauthn_credentials")
      .select("*")
      .eq("credential_id", credentialId)
      .maybeSingle();

    if (credErr || !credential) throw new Error("Credencial no encontrada");

    // Decode stored public key (base64url → Uint8Array)
    const b64ToUint8 = (b64: string) =>
      Uint8Array.from(atob(b64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      authenticator: {
        credentialID: b64ToUint8(credential.credential_id),
        credentialPublicKey: b64ToUint8(credential.public_key),
        counter: credential.counter,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) throw new Error("Verificación biométrica fallida");

    // Update counter and last_used_at
    await admin
      .from("webauthn_credentials")
      .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
      .eq("id", credential.id);

    // Generate session token
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });
    if (linkError) throw new Error(linkError.message);

    const token_hash = (linkData as any).properties?.hashed_token;
    if (!token_hash) throw new Error("No se pudo generar el token de sesión");

    // Clean up challenge
    await admin.from("webauthn_challenges").delete().eq("id", challenge_id);

    return new Response(JSON.stringify({ token_hash }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-webauthn-login-finish error:", err);
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
