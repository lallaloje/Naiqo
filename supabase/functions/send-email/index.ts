import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') || 'hola@naiqo.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada');

    const { type, to, data } = await req.json();

    let subject = '';
    let html = '';

    if (type === 'welcome') {
      subject = '¡Bienvenida a NAIQO! 🎉';
      html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#1a1a1a">
          <h1 style="color:#d946ef;margin-bottom:8px">¡Hola, ${data.name}! 👋</h1>
          <p style="font-size:16px;line-height:1.6">Bienvenida a <strong>NAIQO</strong>, la plataforma inteligente para tu salón de uñas.</p>
          <p style="font-size:15px;line-height:1.6">Tu período de acceso está activo hasta el <strong>${data.trialEndDate}</strong>.</p>
          <div style="background:#fdf4ff;border-radius:12px;padding:20px;margin:24px 0">
            <p style="margin:0 0 12px;font-weight:600">Para empezar:</p>
            <ol style="padding-left:20px;line-height:2">
              <li>Ve a <strong>Gestión de Citas → Servicios</strong> y añade tus servicios con precios y duración</li>
              <li>Añade a tu equipo en <strong>Equipo</strong></li>
              <li>Comparte tu <strong>enlace de reserva</strong> con tus clientes</li>
            </ol>
          </div>
          <a href="${data.appUrl}/gestion-citas" style="display:inline-block;background:#d946ef;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Ir a mi panel →
          </a>
          <p style="margin-top:32px;font-size:13px;color:#666">Si tienes cualquier duda, responde a este email y te ayudamos 💅</p>
          <p style="font-size:13px;color:#666">El equipo de NAIQO</p>
        </div>
      `;
    } else if (type === 'booking_confirmation') {
      subject = `✅ Reserva confirmada — ${data.serviceName}`;
      html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#1a1a1a">
          <h1 style="color:#d946ef">Tu cita está confirmada 💅</h1>
          <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0">
            <p style="margin:0 0 8px"><strong>Servicio:</strong> ${data.serviceName}</p>
            <p style="margin:0 0 8px"><strong>Fecha:</strong> ${data.date}</p>
            <p style="margin:0 0 8px"><strong>Hora:</strong> ${data.time}</p>
            <p style="margin:0"><strong>Salón:</strong> ${data.salonName}</p>
          </div>
          <p style="font-size:14px;color:#666">Si necesitas cancelar, hazlo con al menos 24h de antelación.</p>
        </div>
      `;
    } else {
      throw new Error(`Tipo de email desconocido: ${type}`);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Error de Resend');

    return new Response(JSON.stringify({ id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error send-email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
