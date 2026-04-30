import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resendApiKey   = Deno.env.get('RESEND_API_KEY')!;
const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'NAIQO Reservas <reservas@naiqo.es>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Error Resend:', err);
  }
  return res.ok;
}

function buildReminderEmail(params: {
  clientName: string;
  salonName: string;
  serviceName: string;
  startTime: string;
  phone: string | null;
  hoursAhead: number;
}) {
  const dt   = new Date(params.startTime);
  const date = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const when = params.hoursAhead <= 2 ? 'en menos de 2 horas' : 'mañana';

  return {
    subject: `Recordatorio: tu cita en ${params.salonName} es ${when}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background: #f9f0f5; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

    <div style="background: linear-gradient(135deg, #e879a0, #a855f7); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">💅 NAIQO</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Recordatorio de cita</p>
    </div>

    <div style="padding: 32px 24px;">
      <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 24px;">Hola <strong>${params.clientName}</strong> 👋</p>

      <p style="color: #555; margin: 0 0 24px; font-size: 15px;">
        Te recordamos que tienes una cita <strong>${when}</strong>:
      </p>

      <div style="background: #fdf4fb; border: 1px solid #f0c0e0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #888; font-size: 14px; width: 40%;">💅 Servicio</td>
            <td style="padding: 6px 0; color: #1a1a1a; font-weight: bold; font-size: 14px;">${params.serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #888; font-size: 14px;">📍 Salón</td>
            <td style="padding: 6px 0; color: #1a1a1a; font-size: 14px;">${params.salonName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #888; font-size: 14px;">📅 Fecha</td>
            <td style="padding: 6px 0; color: #1a1a1a; font-size: 14px; text-transform: capitalize;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #888; font-size: 14px;">🕐 Hora</td>
            <td style="padding: 6px 0; color: #e879a0; font-weight: bold; font-size: 16px;">${time}</td>
          </tr>
        </table>
      </div>

      ${params.phone ? `
      <p style="color: #555; font-size: 14px; margin: 0 0 8px;">
        ¿Necesitas cancelar o cambiar? Contáctanos:
      </p>
      <a href="tel:${params.phone}" style="display: inline-block; background: #25D366; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; margin-bottom: 24px;">
        📞 Llamar al salón
      </a>
      ` : ''}

      <p style="color: #aaa; font-size: 12px; margin: 24px 0 0; text-align: center;">
        ¡Te esperamos! — ${params.salonName}<br>
        <span style="color: #ccc;">Gestionado por NAIQO</span>
      </p>
    </div>
  </div>
</body>
</html>`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, supabaseService);
    const now      = new Date();

    // ── Recordatorio 24h ─────────────────────────────────────────
    const in24hFrom = new Date(now.getTime() + 23 * 3600000).toISOString();
    const in24hTo   = new Date(now.getTime() + 25 * 3600000).toISOString();

    const { data: apts24h } = await supabase
      .from('appointments')
      .select('*, salons(salon_name, phone), services(name)')
      .gte('start_time', in24hFrom)
      .lte('start_time', in24hTo)
      .eq('reminder_24h_sent', false)
      .not('client_email', 'is', null)
      .in('status', ['scheduled', 'confirmed']);

    let sent24 = 0;
    for (const apt of (apts24h || [])) {
      const salonName   = (apt as any).salons?.salon_name || 'Tu salón';
      const salonPhone  = (apt as any).salons?.phone || null;
      const serviceName = (apt as any).services?.name || 'tu servicio';

      const { subject, html } = buildReminderEmail({
        clientName: apt.client_name,
        salonName, serviceName,
        startTime: apt.start_time,
        phone: salonPhone,
        hoursAhead: 24,
      });

      const ok = await sendEmail(apt.client_email!, subject, html);
      if (ok) {
        await supabase.from('appointments').update({ reminder_24h_sent: true }).eq('id', apt.id);
        sent24++;
      }
    }

    // ── Recordatorio 2h ──────────────────────────────────────────
    const in2hFrom = new Date(now.getTime() + 1.5 * 3600000).toISOString();
    const in2hTo   = new Date(now.getTime() + 2.5 * 3600000).toISOString();

    const { data: apts2h } = await supabase
      .from('appointments')
      .select('*, salons(salon_name, phone), services(name)')
      .gte('start_time', in2hFrom)
      .lte('start_time', in2hTo)
      .eq('reminder_2h_sent', false)
      .not('client_email', 'is', null)
      .in('status', ['scheduled', 'confirmed']);

    let sent2 = 0;
    for (const apt of (apts2h || [])) {
      const salonName   = (apt as any).salons?.salon_name || 'Tu salón';
      const salonPhone  = (apt as any).salons?.phone || null;
      const serviceName = (apt as any).services?.name || 'tu servicio';

      const { subject, html } = buildReminderEmail({
        clientName: apt.client_name,
        salonName, serviceName,
        startTime: apt.start_time,
        phone: salonPhone,
        hoursAhead: 2,
      });

      const ok = await sendEmail(apt.client_email!, subject, html);
      if (ok) {
        await supabase.from('appointments').update({ reminder_2h_sent: true }).eq('id', apt.id);
        sent2++;
      }
    }

    console.log(`Recordatorios enviados: ${sent24} de 24h, ${sent2} de 2h`);

    return new Response(JSON.stringify({
      success: true,
      sent_24h: sent24,
      sent_2h: sent2,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error send-reminders:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
