import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase        = createClient(supabaseUrl, supabaseService);

    const now = new Date();

    // ── 24h window: appointments starting between now+23h and now+25h ──
    const win24Start = new Date(now.getTime() + 23 * 3600 * 1000).toISOString();
    const win24End   = new Date(now.getTime() + 25 * 3600 * 1000).toISOString();

    // ── 2h window: appointments starting between now+1.75h and now+2.25h ──
    const win2Start  = new Date(now.getTime() + 1.75 * 3600 * 1000).toISOString();
    const win2End    = new Date(now.getTime() + 2.25 * 3600 * 1000).toISOString();

    const [res24, res2] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, client_name, client_phone, client_email, start_time, salons(salon_name, address, city), services(name)")
        .gte("start_time", win24Start)
        .lte("start_time", win24End)
        .eq("reminder_24h_sent", false)
        .in("status", ["scheduled", "confirmed"]),
      supabase
        .from("appointments")
        .select("id, client_name, client_phone, client_email, start_time, salons(salon_name, address, city), services(name)")
        .gte("start_time", win2Start)
        .lte("start_time", win2End)
        .eq("reminder_2h_sent", false)
        .in("status", ["scheduled", "confirmed"]),
    ]);

    const sent24: string[] = [];
    const sent2:  string[] = [];

    const sendReminder = async (apt: any, label: "24h" | "2h") => {
      const dt = new Date(apt.start_time);
      const date = dt.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });
      const time = dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
      const salonName    = (apt.salons as any)?.salon_name || "tu salón";
      const salonAddress = [(apt.salons as any)?.address, (apt.salons as any)?.city].filter(Boolean).join(", ");
      const serviceName  = (apt.services as any)?.name || "";

      // WhatsApp (solo cuando Meta esté verificado)
      if (apt.client_phone) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseService}` },
            body: JSON.stringify({ type: "cita_recordatorio", to: apt.client_phone, clientName: apt.client_name, serviceName, salonName, date, time }),
          });
        } catch (e) {
          console.error("WhatsApp reminder error:", e);
        }
      }

      // Email (siempre que haya email)
      if (apt.client_email) {
        const hoursText = label === "24h" ? "mañana" : "en 2 horas";
        const emailResp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseService}` },
          body: JSON.stringify({
            type: "reminder",
            to: apt.client_email,
            data: { clientName: apt.client_name, serviceName, salonName, salonAddress: salonAddress || undefined, date, time, hoursText },
          }),
        });
        const emailBody = await emailResp.json();
        if (emailBody.error) throw new Error(`send-email: ${emailBody.error}`);
      }
    };

    for (const apt of (res24.data || [])) {
      try {
        await sendReminder(apt, "24h");
        sent24.push(apt.id);
      } catch (e) {
        console.error("24h reminder error:", apt.id, e);
      }
    }

    for (const apt of (res2.data || [])) {
      try {
        await sendReminder(apt, "2h");
        sent2.push(apt.id);
      } catch (e) {
        console.error("2h reminder error:", apt.id, e);
      }
    }

    // Mark as sent
    if (sent24.length > 0) {
      await supabase.from("appointments").update({ reminder_24h_sent: true }).in("id", sent24);
    }
    if (sent2.length > 0) {
      await supabase.from("appointments").update({ reminder_2h_sent: true }).in("id", sent2);
    }

    return new Response(
      JSON.stringify({ success: true, sent_24h: sent24.length, sent_2h: sent2.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-reminders error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
