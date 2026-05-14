// auth-pin-login: verifies PIN and returns a hashed_token for session creation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { email, pin } = await req.json();
    if (!email || !pin) throw new Error("Email y PIN requeridos");
    if (!/^\d{6}$/.test(pin)) throw new Error("PIN inválido");

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Find user_id via salons table (avoids slow listUsers)
    const { data: salon, error: salonErr } = await admin
      .from("salons")
      .select("user_id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (salonErr) throw new Error(salonErr.message);
    if (!salon?.user_id) throw new Error("Usuario no encontrado");

    // 2. Get PIN hash from profiles
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("login_pin_hash, login_pin_salt")
      .eq("user_id", salon.user_id)
      .maybeSingle();

    if (profileErr) throw new Error(profileErr.message);
    if (!profile?.login_pin_hash || !profile?.login_pin_salt) {
      throw new Error("PIN no configurado. Configúralo en Mi Cuenta → Acceso rápido.");
    }

    // 3. Verify PIN
    const computedHash = await hashPin(pin, profile.login_pin_salt);
    if (computedHash !== profile.login_pin_hash) {
      throw new Error("PIN incorrecto");
    }

    // 4. Get auth user's email for generateLink
    const { data: authUserData, error: authErr } = await admin.auth.admin.getUserById(salon.user_id);
    if (authErr || !authUserData?.user?.email) throw new Error("Error obteniendo datos de usuario");

    // 5. Generate magic link token (no email sent)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authUserData.user.email,
    });
    if (linkError) throw new Error(linkError.message);

    const token_hash = (linkData as any).properties?.hashed_token;
    if (!token_hash) throw new Error("No se pudo generar el token de sesión");

    return new Response(JSON.stringify({ token_hash }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-pin-login error:", err);
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
