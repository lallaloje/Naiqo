import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plantillas aprobadas en Meta — los nombres deben coincidir exactamente
const TEMPLATES: Record<string, { name: string; language: string }> = {
  cita_pendiente:    { name: "naiqo_cita_pendiente",    language: "es" },
  cita_confirmada:   { name: "naiqo_cita_confirmada",   language: "es" },
  cita_modificada:   { name: "naiqo_cita_modificada",   language: "es" },
  cita_cancelada:    { name: "naiqo_cita_cancelada",    language: "es" },
  cita_recordatorio: { name: "naiqo_cita_recordatorio", language: "es" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token         = Deno.env.get("WHATSAPP_TOKEN")!;
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;

    const {
      type,         // "cita_pendiente" | "cita_confirmada" | "cita_modificada" | "cita_cancelada"
      to,           // número destino con prefijo: "34614002867"
      clientName,
      serviceName,
      salonName,
      date,         // ej: "lunes, 3 de noviembre"
      time,         // ej: "12:30"
    } = await req.json();

    const template = TEMPLATES[type];
    if (!template) throw new Error(`Tipo desconocido: ${type}`);
    if (!to)       throw new Error("Falta el número de destino (to)");

    // Normalizar número: quitar +, espacios, guiones
    const toClean = to.replace(/[\s+\-]/g, "");

    const body = {
      messaging_product: "whatsapp",
      to: toClean,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: clientName  || "" },
              { type: "text", text: serviceName || "" },
              { type: "text", text: salonName   || "" },
              { type: "text", text: date        || "" },
              { type: "text", text: time        || "" },
            ],
          },
        ],
      },
    };

    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const result = await res.json();

    if (!res.ok) {
      console.error("WhatsApp API error:", JSON.stringify(result));
      throw new Error(result?.error?.message || "Error de WhatsApp API");
    }

    return new Response(JSON.stringify({ success: true, id: result?.messages?.[0]?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-whatsapp error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
