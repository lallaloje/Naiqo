import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') || 'hola@naiqo.es';
const REPLY_TO       = 'naiqoia@gmail.com';

// Genera el SVG/HTML del QR usando una API pública de QR
function qrImageUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(text)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada');

    const { code, salon_id, service_name, price_cents, buyer_name,
            recipient_name, recipient_email, message, expires_at } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Obtener nombre del salón
    const { data: salon } = await supabase
      .from('salons')
      .select('salon_name')
      .eq('id', salon_id)
      .maybeSingle();
    const salonName = salon?.salon_name || 'NAIQO';

    const priceEuros = (price_cents / 100).toFixed(0);
    const expiresFormatted = new Date(expires_at).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid',
    });
    const qrUrl = qrImageUrl(code);
    const fromLabel = buyer_name ? `De parte de <strong>${buyer_name}</strong>` : 'Un regalo especial para ti';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdf4ff;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;padding:0 16px 32px">

    <!-- Header -->
    <div style="text-align:center;padding:32px 0 8px">
      <p style="margin:0;font-size:13px;color:#a855f7;font-weight:600;letter-spacing:2px;text-transform:uppercase">NAIQO</p>
      <h1 style="margin:8px 0 0;font-size:28px;color:#1a1a1a;font-weight:700">Tarjeta Regalo 🎁</h1>
    </div>

    <!-- Card -->
    <div style="background:linear-gradient(135deg,#d946ef 0%,#a855f7 50%,#7c3aed 100%);border-radius:20px;padding:2px;margin:24px 0">
      <div style="background:white;border-radius:18px;overflow:hidden">

        <!-- Top band -->
        <div style="background:linear-gradient(135deg,#d946ef 0%,#a855f7 50%,#7c3aed 100%);padding:24px 28px 20px">
          <p style="margin:0 0 4px;color:rgba(255,255,255,0.8);font-size:12px;text-transform:uppercase;letter-spacing:1px">Para</p>
          <h2 style="margin:0;color:white;font-size:26px;font-weight:700">${recipient_name}</h2>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">${fromLabel}</p>
        </div>

        <!-- Service -->
        <div style="padding:20px 28px;border-bottom:1px solid #f3e8ff">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px">Servicio incluido</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:#1a1a1a">${service_name}</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#d946ef">${priceEuros}€</p>
        </div>

        ${message ? `
        <!-- Message -->
        <div style="padding:16px 28px;border-bottom:1px solid #f3e8ff;background:#fdf4ff">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px">Mensaje</p>
          <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;font-style:italic">"${message}"</p>
        </div>
        ` : ''}

        <!-- QR + Code -->
        <div style="padding:20px 28px;display:flex;align-items:center;gap:20px">
          <div style="text-align:center">
            <img src="${qrUrl}" alt="QR" width="100" height="100" style="border-radius:8px;border:1px solid #e5e7eb">
          </div>
          <div style="flex:1">
            <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px">Código</p>
            <p style="margin:0;font-size:24px;font-weight:800;color:#1a1a1a;letter-spacing:4px;font-family:monospace">${code}</p>
            <p style="margin:8px 0 0;font-size:12px;color:#9ca3af">Válido hasta el ${expiresFormatted}</p>
          </div>
        </div>

        <!-- Footer note -->
        <div style="padding:12px 28px 20px;background:#f9fafb">
          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6">
            Presenta este código (escaneando el QR o diciéndolo) al llegar a <strong>${salonName}</strong>.
            La tarjeta es válida para el servicio indicado durante un año.
          </p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">
      NAIQO · El asistente IA para salones de uñas
    </p>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Naiqo <${FROM_EMAIL}>`,
        reply_to: REPLY_TO,
        to: recipient_email,
        subject: `🎁 ¡Tienes una tarjeta regalo de ${salonName}!`,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Error de Resend');

    return new Response(JSON.stringify({ id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('send-gift-card-email error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
