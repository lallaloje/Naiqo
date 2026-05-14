// auth-webauthn-login-start: generates authentication options for WebAuthn login
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// @ts-ignore
import { generateAuthenticationOptions } from "https://esm.sh/@simplewebauthn/server@9.0.3";

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

    // Find user by email
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw new Error(listError.message);

    const authUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!authUser) throw new Error("Usuario no encontrado");

    // Get user's registered credentials
    const { data: creds, error: credsErr } = await admin
      .from("webauthn_credentials")
      .select("credential_id")
      .eq("user_id", authUser.id);

    if (credsErr) throw new Error(credsErr.message);
    if (!creds || creds.length === 0) throw new Error("No hay credenciales biométricas registradas");

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

    // Store challenge
    const { data: challengeRow, error: chalErr } = await admin
      .from("webauthn_challenges")
      .insert({ email: authUser.email!, challenge: options.challenge, type: "authentication" })
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
