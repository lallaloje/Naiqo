import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const { clientName, clientEmail, salonName, salonPhone, serviceName, startTime, durationMinutes } = await req.json();
    if (!clientEmail || !clientName) throw new Error("clientEmail and clientName required");

    const dt = new Date(startTime);
    const dateStr = dt.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timeStr = dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f4ff;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ff;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#ec4899,#8b5cf6);padding:32px;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">💅</div>
          <h1 style="color:#fff;margin:0;font-size:24px;">¡Cita confirmada!</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">${salonName}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="color:#374151;font-size:16px;margin:0 0 24px;">Hola <strong>${clientName}</strong>, tu cita ha sido registrada. El salón la confirmará en breve.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
            <tr><td style="padding:8px 0;"><table width="100%"><tr>
              <td style="color:#6b7280;font-size:14px;width:40%;">💅 Servicio</td>
              <td style="color:#111827;font-size:14px;font-weight:600;">${serviceName}</td>
            </tr></table></td></tr>
            <tr><td style="padding:8px 0;border-top:1px solid #e5e7eb;"><table width="100%"><tr>
              <td style="color:#6b7280;font-size:14px;width:40%;">📅 Fecha</td>
              <td style="color:#111827;font-size:14px;font-weight:600;">${dateStr}</td>
            </tr></table></td></tr>
            <tr><td style="padding:8px 0;border-top:1px solid #e5e7eb;"><table width="100%"><tr>
              <td style="color:#6b7280;font-size:14px;width:40%;">🕐 Hora</td>
              <td style="color:#111827;font-size:14px;font-weight:600;">${timeStr} (${durationMinutes} min)</td>
            </tr></table></td></tr>
            ${salonPhone ? `<tr><td style="padding:8px 0;border-top:1px solid #e5e7eb;"><table width="100%"><tr>
              <td style="color:#6b7280;font-size:14px;width:40%;">📞 Salón</td>
              <td style="color:#111827;font-size:14px;font-weight:600;">${salonPhone}</td>
            </tr></table></td></tr>` : ""}
          </table>
          <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">¿Necesitas cancelar? Visita <a href="https://naiqo.es/cliente/mis-citas" style="color:#8b5cf6;">naiqo.es/cliente/mis-citas</a> o contacta con el salón.</p>
        </td></tr>
        <tr><td style="background:#f3f4f6;padding:16px 32px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">Gestionado por <strong style="color:#8b5cf6;">NAIQO</strong> · naiqo.es</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NAIQO <citas@naiqo.es>",
        to: [clientEmail],
        subject: `✅ Cita en ${salonName} — ${dateStr} a las ${timeStr}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    console.error("send-booking-confirmation error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
