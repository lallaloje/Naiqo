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
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f5f0ff;font-family:'Inter',Arial,sans-serif">

  <!-- Wrapper -->
  <div style="max-width:540px;margin:0 auto;padding:40px 16px 48px">

    <!-- Brand -->
    <div style="text-align:center;margin-bottom:28px">
      <p style="margin:0;font-size:11px;color:#a855f7;font-weight:600;letter-spacing:3px;text-transform:uppercase">✦ NAIQO ✦</p>
    </div>

    <!-- Main card -->
    <div style="border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(168,85,247,0.18)">

      <!-- Hero gradient -->
      <div style="background:linear-gradient(145deg,#1a0533 0%,#4a0080 40%,#9333ea 75%,#d946ef 100%);padding:40px 32px 32px;text-align:center;position:relative">
        <!-- Decorative circles -->
        <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.05)"></div>
        <div style="position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.05)"></div>

        <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase">Tarjeta Regalo</p>
        <div style="font-size:48px;line-height:1;margin:12px 0">💅</div>
        <h1 style="margin:12px 0 4px;font-family:'Playfair Display',Georgia,serif;font-size:34px;font-weight:700;color:white;line-height:1.1">${recipient_name}</h1>
        <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.75)">${fromLabel}</p>
      </div>

      <!-- White body -->
      <div style="background:white;padding:0">

        <!-- Service + price -->
        <div style="padding:28px 32px;text-align:center;border-bottom:1px solid #f3e8ff">
          <p style="margin:0 0 6px;font-size:11px;color:#c084fc;letter-spacing:2px;text-transform:uppercase;font-weight:600">Servicio incluido</p>
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a">${service_name}</p>
          <div style="display:inline-block;background:linear-gradient(135deg,#d946ef,#9333ea);border-radius:50px;padding:8px 24px">
            <span style="font-size:26px;font-weight:800;color:white">${priceEuros}€</span>
          </div>
        </div>

        ${message ? `
        <!-- Message -->
        <div style="padding:22px 32px;border-bottom:1px solid #f3e8ff;background:#fdf8ff;text-align:center">
          <p style="margin:0 0 8px;font-size:18px">💬</p>
          <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;font-style:italic">"${message}"</p>
        </div>
        ` : ''}

        <!-- QR section -->
        <div style="padding:28px 32px;text-align:center;background:white">
          <p style="margin:0 0 16px;font-size:11px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase">Código para canjear</p>
          <div style="display:inline-block;background:#fdf4ff;border:2px solid #e9d5ff;border-radius:16px;padding:16px">
            <img src="${qrUrl}" alt="QR" width="140" height="140" style="display:block;border-radius:8px">
          </div>
          <div style="margin:16px 0 4px;display:inline-block;background:#f5f0ff;border-radius:12px;padding:10px 20px">
            <span style="font-size:22px;font-weight:800;color:#7c3aed;letter-spacing:5px;font-family:'Courier New',monospace">${code}</span>
          </div>
          <p style="margin:10px 0 0;font-size:12px;color:#9ca3af">Válida hasta el <strong style="color:#6b7280">${expiresFormatted}</strong></p>
        </div>

        <!-- CTA -->
        <div style="padding:0 32px 28px;text-align:center">
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280;line-height:1.6">
            Presenta este código en <strong style="color:#1a1a1a">${salonName}</strong> para disfrutar de tu servicio.
          </p>
        </div>

        <!-- Bottom strip -->
        <div style="background:linear-gradient(145deg,#1a0533,#7c3aed);padding:14px 32px;text-align:center">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase">✦ NAIQO · Salones de uñas ✦</p>
        </div>
      </div>
    </div>

    <p style="text-align:center;font-size:11px;color:#c4b5fd;margin-top:24px;letter-spacing:1px">
      Este email fue generado automáticamente. No es necesario responder.
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
