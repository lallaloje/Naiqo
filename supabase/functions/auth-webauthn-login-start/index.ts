// auth-webauthn-login-start: generates authentication options for WebAuthn login
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { generateAuthenticationOptions } from "npm:@simplewebauthn/server@9.0.3";

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

    const { email } = await req.json();
    if (!email) throw new Error("Email requerido");

    const admin = createClient(supabaseUrl, serviceKey);

    // Find user_id via salons table
    const { data: salon } = await admin
      .from("salons")
      .select("user_id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (!salon?.user_id) throw new Error("Usuario no encontrado");

    const { data: creds } = await admin
      .from("webauthn_credentials")
      .select("credential_id")
      .eq("user_id", salon.user_id);

    if (!creds || creds.length === 0) {
      throw new Error("No hay credenciales biométricas registradas. Configúralas en Mi Cuenta.");
    }

    const allowCredentials = creds.map((c: any) => ({
      id: c.credential_id,
      type: "public-key" as const,
    }));

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials,
      userVerification: "required",
      timeout: 60000,
    });

    const { data: authUserData } = await admin.auth.admin.getUserById(salon.user_id);
    const authEmail = authUserData?.user?.email || email;

    const { data: challengeRow, error: chalErr } = await admin
      .from("webauthn_challenges")
      .insert({ email: authEmail, challenge: options.challenge, type: "authentication" })
      .select("id")
      .single();

    if (chalErr) throw new Error(chalErr.message);

    return new Response(
      JSON.stringify({ options, challenge_id: challengeRow.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("auth-webauthn-login-start error:", err);
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
