import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') || 'hola@naiqo.es';
const REPLY_TO       = 'naiqoia@gmail.com';

function qrImageUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(text)}`;
}

type Occasion = 'birthday' | 'christmas' | 'valentine' | 'anniversary' | 'general';
type Design   = 'classic' | 'romantic' | 'minimal' | 'golden';

interface OccasionTheme {
  emoji: string;
  label: string;
  greeting: string;
}

const occasionThemes: Record<Occasion, OccasionTheme> = {
  birthday:    { emoji: '🎂', label: 'Tarjeta de Cumpleaños', greeting: '¡Feliz cumpleaños!' },
  christmas:   { emoji: '🎄', label: 'Regalo de Navidad',     greeting: '¡Feliz Navidad!' },
  valentine:   { emoji: '💝', label: 'Regalo de San Valentín', greeting: 'Con todo mi amor' },
  anniversary: { emoji: '💍', label: 'Regalo de Aniversario', greeting: '¡Feliz aniversario!' },
  general:     { emoji: '💅', label: 'Tarjeta Regalo',         greeting: 'Un regalo especial' },
};

function buildClassicHtml(params: {
  recipientName: string; fromLabel: string; salonName: string;
  serviceName: string; priceEuros: string; message: string;
  code: string; qrUrl: string; expiresFormatted: string;
  theme: OccasionTheme;
}): string {
  const { recipientName, fromLabel, salonName, serviceName, priceEuros,
          message, code, qrUrl, expiresFormatted, theme } = params;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#f5f0ff;font-family:'Inter',Arial,sans-serif">
<div style="max-width:540px;margin:0 auto;padding:40px 16px 48px">
  <div style="text-align:center;margin-bottom:28px">
    <p style="margin:0;font-size:11px;color:#a855f7;font-weight:600;letter-spacing:3px;text-transform:uppercase">✦ NAIQO ✦</p>
  </div>
  <div style="border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(168,85,247,0.18)">
    <div style="background:linear-gradient(145deg,#1a0533 0%,#4a0080 40%,#9333ea 75%,#d946ef 100%);padding:40px 32px 32px;text-align:center">
      <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,.6);letter-spacing:3px;text-transform:uppercase">${theme.label}</p>
      <div style="font-size:48px;line-height:1;margin:12px 0">${theme.emoji}</div>
      <h1 style="margin:12px 0 4px;font-family:'Playfair Display',Georgia,serif;font-size:34px;font-weight:700;color:white;line-height:1.1">${recipientName}</h1>
      <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,.75)">${fromLabel}</p>
    </div>
    <div style="background:white">
      <div style="padding:28px 32px;text-align:center;border-bottom:1px solid #f3e8ff">
        <p style="margin:0 0 6px;font-size:11px;color:#c084fc;letter-spacing:2px;text-transform:uppercase;font-weight:600">Servicio incluido</p>
        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a">${serviceName}</p>
        <div style="display:inline-block;background:linear-gradient(135deg,#d946ef,#9333ea);border-radius:50px;padding:8px 24px">
          <span style="font-size:26px;font-weight:800;color:white">${priceEuros}€</span>
        </div>
      </div>
      ${message ? `<div style="padding:22px 32px;border-bottom:1px solid #f3e8ff;background:#fdf8ff;text-align:center">
        <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;font-style:italic">"${message}"</p>
      </div>` : ''}
      <div style="padding:28px 32px;text-align:center">
        <p style="margin:0 0 16px;font-size:11px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase">Código para canjear</p>
        <div style="display:inline-block;background:#fdf4ff;border:2px solid #e9d5ff;border-radius:16px;padding:16px">
          <img src="${qrUrl}" alt="QR" width="140" height="140" style="display:block;border-radius:8px">
        </div>
        <div style="margin:16px 0 4px;display:inline-block;background:#f5f0ff;border-radius:12px;padding:10px 20px">
          <span style="font-size:22px;font-weight:800;color:#7c3aed;letter-spacing:5px;font-family:'Courier New',monospace">${code}</span>
        </div>
        <p style="margin:10px 0 0;font-size:12px;color:#9ca3af">Válida hasta el <strong style="color:#6b7280">${expiresFormatted}</strong></p>
      </div>
      <div style="padding:0 32px 28px;text-align:center">
        <p style="margin:0;font-size:13px;color:#6b7280">Presenta este código en <strong style="color:#1a1a1a">${salonName}</strong>.</p>
      </div>
      <div style="background:linear-gradient(145deg,#1a0533,#7c3aed);padding:14px 32px;text-align:center">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase">✦ NAIQO · Salones de uñas ✦</p>
      </div>
    </div>
  </div>
  <p style="text-align:center;font-size:11px;color:#c4b5fd;margin-top:24px">Este email fue generado automáticamente.</p>
</div></body></html>`;
}

function buildRomanticHtml(params: {
  recipientName: string; fromLabel: string; salonName: string;
  serviceName: string; priceEuros: string; message: string;
  code: string; qrUrl: string; expiresFormatted: string;
  theme: OccasionTheme;
}): string {
  const { recipientName, fromLabel, salonName, serviceName, priceEuros,
          message, code, qrUrl, expiresFormatted, theme } = params;

  // Adapt colors per occasion
  const isValentine   = theme.label.includes('Valentín');
  const isChristmas   = theme.label.includes('Navidad');
  const topBg         = isChristmas ? '#f0fff4' : '#fff0f6';
  const ribbonBg      = isChristmas ? '#dcfce7' : '#fce7f3';
  const ribbonBorder  = isChristmas ? '#86efac' : '#f9a8d4';
  const ribbonColor   = isChristmas ? '#15803d' : '#be185d';
  const nameColor     = isChristmas ? '#14532d' : '#831843';
  const fromColor     = isChristmas ? '#16a34a' : '#9d174d';
  const priceColor    = isChristmas ? '#16a34a' : '#db2777';
  const codeColor     = isChristmas ? '#15803d' : '#be185d';
  const footerBg      = isChristmas ? '#14532d' : '#831843';
  const deco          = isChristmas ? '🎄🎁🎄' : isValentine ? '💝💕💝' : '🌸🌷🌸';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#fdf2f8;font-family:'Inter',Arial,sans-serif">
<div style="max-width:540px;margin:0 auto;padding:40px 16px 48px">
  <div style="border-radius:24px;overflow:hidden;box-shadow:0 16px 48px rgba(236,72,153,.18)">
    <div style="background:${topBg};padding:32px 28px 0;text-align:center">
      <div style="display:inline-block;background:${ribbonBg};border:1px solid ${ribbonBorder};border-radius:100px;padding:5px 16px;font-size:11px;color:${ribbonColor};font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px">${theme.label}</div>
      <p style="font-size:28px;margin:0 0 10px">${deco}</p>
      <h1 style="font-family:'DM Serif Display',Georgia,serif;font-size:32px;color:${nameColor};margin:0 0 6px;font-style:italic">${recipientName}</h1>
      <p style="font-size:13px;color:${fromColor};margin:0 0 20px">${fromLabel}</p>
    </div>
    <svg width="100%" height="32" viewBox="0 0 540 32" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <path d="M0,0 C120,32 420,0 540,24 L540,0 Z" fill="${topBg}"/>
      <path d="M0,0 C120,32 420,0 540,24 L540,32 L0,32 Z" fill="#fff"/>
    </svg>
    <div style="background:#fff">
      <div style="padding:22px 28px 18px;text-align:center">
        <p style="font-size:18px;font-weight:600;color:#1f2937;margin:0 0 8px">${serviceName}</p>
        <span style="font-size:32px;font-weight:800;color:${priceColor};font-family:sans-serif">${priceEuros}€</span>
        <p style="font-size:12px;color:#9ca3af;margin:4px 0 0">en ${salonName}</p>
      </div>
      <div style="height:1px;background:linear-gradient(90deg,transparent,#fce7f3,transparent);margin:0 28px"></div>
      ${message ? `<div style="padding:18px 28px;text-align:center">
        <p style="font-size:14px;color:#4b5563;line-height:1.7;font-style:italic;margin:0">"${message}"</p>
      </div>` : ''}
      <div style="padding:20px 28px;text-align:center;background:${topBg}">
        <p style="font-size:11px;color:${codeColor};font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px">Tu código regalo</p>
        <div style="display:inline-flex;align-items:center;gap:16px;background:#fff;border-radius:16px;padding:14px 20px;border:1.5px solid ${ribbonBg}">
          <img src="${qrUrl}" alt="QR" width="96" height="96" style="border-radius:8px">
          <div style="text-align:left">
            <div style="font-size:18px;font-weight:800;color:${codeColor};letter-spacing:4px;font-family:'Courier New',monospace">${code}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px">Válida hasta ${expiresFormatted}</div>
          </div>
        </div>
      </div>
      <div style="background:${footerBg};padding:14px;text-align:center">
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,.75);letter-spacing:2px;text-transform:uppercase">✦ NAIQO · Salones de uñas ✦</p>
      </div>
    </div>
  </div>
</div></body></html>`;
}

function buildMinimalHtml(params: {
  recipientName: string; fromLabel: string; salonName: string;
  serviceName: string; priceEuros: string; message: string;
  code: string; qrUrl: string; expiresFormatted: string;
  theme: OccasionTheme;
}): string {
  const { recipientName, fromLabel, salonName, serviceName, priceEuros,
          message, code, qrUrl, expiresFormatted, theme } = params;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#f3f4f6;font-family:'Inter',Arial,sans-serif">
<div style="max-width:540px;margin:0 auto;padding:40px 16px 48px">
  <div style="background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 32px rgba(0,0,0,.12)">
    <div style="height:4px;background:#111"></div>
    <div style="padding:36px 36px 28px">
      <div style="font-size:10px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:#111;margin-bottom:32px">NAIQO</div>
      <div style="font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#9ca3af;margin-bottom:8px">${theme.label}</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:36px;font-weight:700;color:#111;line-height:1;margin-bottom:4px">${recipientName}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:6px">${fromLabel}</div>
    </div>
    <div style="border-top:1px solid #e5e7eb;margin:0 36px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;padding:24px 36px;gap:20px">
      <div>
        <div style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;margin-bottom:5px">Servicio</div>
        <div style="font-size:15px;font-weight:600;color:#111">${serviceName}</div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;margin-bottom:5px">Valor</div>
        <div style="font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:800;color:#111">${priceEuros}€</div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;margin-bottom:5px">Salón</div>
        <div style="font-size:14px;font-weight:600;color:#111">${salonName}</div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;margin-bottom:5px">Validez</div>
        <div style="font-size:14px;font-weight:600;color:#111">${expiresFormatted}</div>
      </div>
    </div>
    ${message ? `<div style="margin:0 36px 24px;background:#f9fafb;border-left:3px solid #111;padding:14px 18px">
      <p style="font-size:13px;color:#374151;line-height:1.65;margin:0">"${message}"</p>
    </div>` : ''}
    <div style="display:flex;align-items:center;gap:20px;padding:20px 36px 28px">
      <div style="flex-shrink:0;border:1px solid #e5e7eb;border-radius:4px;padding:10px">
        <img src="${qrUrl}" alt="QR" width="96" height="96">
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;margin-bottom:6px">Código de canje</div>
        <div style="font-size:22px;font-weight:800;color:#111;letter-spacing:5px;font-family:'Courier New',monospace">${code}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:6px">Presenta en ${salonName}</div>
      </div>
    </div>
    <div style="background:#111;padding:14px 36px;display:flex;align-items:center;justify-content:space-between">
      <p style="font-size:10px;color:rgba(255,255,255,.5);letter-spacing:2px;text-transform:uppercase;margin:0">NAIQO · SALONES DE UÑAS</p>
      <p style="font-size:10px;color:rgba(255,255,255,.5);margin:0">naiqo.es</p>
    </div>
  </div>
</div></body></html>`;
}

function buildGoldenHtml(params: {
  recipientName: string; fromLabel: string; salonName: string;
  serviceName: string; priceEuros: string; message: string;
  code: string; qrUrl: string; expiresFormatted: string;
  theme: OccasionTheme;
}): string {
  const { recipientName, fromLabel, salonName, serviceName, priceEuros,
          message, code, qrUrl, expiresFormatted, theme } = params;
  const initial = recipientName.trim().charAt(0).toUpperCase();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Space+Grotesk:wght@400;700;800&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#050505;font-family:'Inter',Arial,sans-serif">
<div style="max-width:540px;margin:0 auto;padding:40px 16px 48px">
  <div style="background:#0d0d0d;border-radius:20px;overflow:hidden;box-shadow:0 20px 64px rgba(0,0,0,.7)">
    <div style="background:linear-gradient(160deg,#0d0d0d 0%,#1c1300 50%,#0d0d0d 100%);padding:36px 32px 28px;text-align:center;border-bottom:1px solid rgba(212,175,55,.2)">
      <p style="font-size:10px;letter-spacing:6px;text-transform:uppercase;color:#c9a84c;margin:0 0 18px">— ✦ NAIQO ✦ —</p>
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#c9a84c,#f5e06e);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:#0d0d0d">${initial}</div>
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;color:#f5e9c5;margin:0 0 6px;font-style:italic">${recipientName}</h1>
      <p style="font-size:12px;color:rgba(201,168,76,.7);letter-spacing:1px;margin:0">${fromLabel}</p>
    </div>
    <div style="padding:24px 32px;text-align:center;border-bottom:1px solid rgba(212,175,55,.12)">
      <p style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,.6);margin:0 0 6px">${theme.label}</p>
      <p style="font-size:20px;font-weight:500;color:#f0e8d0;margin:0 0 12px">${serviceName}</p>
      <div style="display:inline-block;border:1px solid rgba(212,175,55,.4);border-radius:4px;padding:8px 28px">
        <span style="font-size:32px;font-weight:800;color:#c9a84c;font-family:'Space Grotesk',sans-serif">${priceEuros}€</span>
      </div>
    </div>
    ${message ? `<div style="padding:20px 32px;border-bottom:1px solid rgba(212,175,55,.12);text-align:center">
      <p style="font-size:14px;color:rgba(240,232,208,.7);line-height:1.75;font-style:italic;margin:0">"${message}"</p>
    </div>` : ''}
    <div style="padding:24px 32px;text-align:center">
      <p style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,.6);margin:0 0 14px">Código para canjear</p>
      <div style="display:inline-block;border:1px solid rgba(212,175,55,.3);padding:14px;border-radius:6px;margin-bottom:16px">
        <img src="${qrUrl}" alt="QR" width="120" height="120" style="display:block;border-radius:4px">
      </div>
      <div style="font-size:20px;font-weight:800;color:#c9a84c;letter-spacing:6px;font-family:'Courier New',monospace">${code}</div>
      <div style="width:48px;height:1px;background:rgba(212,175,55,.3);margin:14px auto"></div>
      <p style="font-size:11px;color:rgba(240,232,208,.4);margin:0">Válida hasta ${expiresFormatted}</p>
    </div>
    <p style="font-size:12px;color:rgba(240,232,208,.6);padding:0 32px 24px;text-align:center;margin:0">Presenta en <strong style="color:#f0e8d0">${salonName}</strong>.</p>
    <div style="background:linear-gradient(90deg,#0d0d0d,#1c1300,#0d0d0d);border-top:1px solid rgba(212,175,55,.2);padding:14px;text-align:center">
      <p style="font-size:10px;color:rgba(201,168,76,.55);letter-spacing:3px;text-transform:uppercase;margin:0">✦ &nbsp; NAIQO · SALONES DE UÑAS &nbsp; ✦</p>
    </div>
  </div>
</div></body></html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada');

    const { code, salon_id, service_name, price_cents, buyer_name,
            recipient_name, recipient_email, message, expires_at,
            occasion = 'general', design = 'classic' } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

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
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(code)}`;

    const theme = occasionThemes[(occasion as Occasion)] ?? occasionThemes.general;
    const fromLabel = buyer_name
      ? `De parte de <strong>${buyer_name}</strong>`
      : theme.greeting;

    const common = {
      recipientName: recipient_name, fromLabel, salonName,
      serviceName: service_name, priceEuros, message: message || '',
      code, qrUrl, expiresFormatted, theme,
    };

    let html: string;
    switch (design as Design) {
      case 'romantic': html = buildRomanticHtml(common); break;
      case 'minimal':  html = buildMinimalHtml(common);  break;
      case 'golden':   html = buildGoldenHtml(common);   break;
      default:         html = buildClassicHtml(common);  break;
    }

    const subjectEmoji = theme.emoji;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Naiqo <${FROM_EMAIL}>`,
        reply_to: REPLY_TO,
        to: recipient_email,
        subject: `${subjectEmoji} ¡Tienes una tarjeta regalo de ${salonName}!`,
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
