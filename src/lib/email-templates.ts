// Shared email templates for NAIQO

const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f5f5f5;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .header {
    background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%);
    padding: 30px;
    text-align: center;
  }
  .header h1 {
    color: #ffffff;
    margin: 0;
    font-size: 28px;
    font-weight: 700;
  }
  .content {
    padding: 40px 30px;
  }
  .content h2 {
    color: #1a1a1a;
    font-size: 24px;
    margin-top: 0;
    margin-bottom: 20px;
  }
  .content p {
    color: #4a4a4a;
    font-size: 16px;
    margin-bottom: 16px;
  }
  .cta-button {
    display: inline-block;
    background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%);
    color: #ffffff !important;
    padding: 14px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    margin: 20px 0;
  }
  .cta-button:hover {
    opacity: 0.9;
  }
  .feature-box {
    background-color: #f8f4ff;
    border-left: 4px solid #d946ef;
    padding: 16px 20px;
    margin: 16px 0;
    border-radius: 0 8px 8px 0;
  }
  .feature-box h3 {
    color: #1a1a1a;
    margin: 0 0 8px 0;
    font-size: 16px;
  }
  .feature-box p {
    color: #666;
    margin: 0;
    font-size: 14px;
  }
  .stats-box {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    margin: 20px 0;
  }
  .stats-box .number {
    font-size: 36px;
    font-weight: 700;
    color: #d97706;
  }
  .stats-box .label {
    font-size: 14px;
    color: #92400e;
  }
  .warning-box {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  }
  .warning-box p {
    color: #dc2626;
    margin: 0;
  }
  .success-box {
    background-color: #ecfdf5;
    border: 1px solid #a7f3d0;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  }
  .success-box p {
    color: #059669;
    margin: 0;
  }
  .footer {
    background-color: #1a1a1a;
    padding: 30px;
    text-align: center;
  }
  .footer p {
    color: #999;
    font-size: 12px;
    margin: 8px 0;
  }
  .footer a {
    color: #d946ef;
    text-decoration: none;
  }
  .social-links {
    margin: 20px 0;
  }
  .social-links a {
    display: inline-block;
    margin: 0 10px;
    color: #999;
    text-decoration: none;
  }
  .divider {
    height: 1px;
    background-color: #e5e5e5;
    margin: 30px 0;
  }
  .ps-note {
    background-color: #f0f9ff;
    padding: 16px;
    border-radius: 8px;
    font-size: 14px;
    color: #0369a1;
  }
  @media (max-width: 600px) {
    .content { padding: 30px 20px; }
    .header { padding: 20px; }
    .header h1 { font-size: 24px; }
    .content h2 { font-size: 20px; }
  }
`;

const wrapTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NAIQO</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`;

const footer = (unsubscribeUrl: string = '#') => `
  <div class="footer">
    <p><strong>NAIQO</strong> - Tu asistente IA para salones de uñas</p>
    <div class="social-links">
      <a href="https://instagram.com/naiqo.es">Instagram</a>
      <a href="https://linkedin.com/company/naiqo">LinkedIn</a>
    </div>
    <p>
      <a href="https://naiqo.es/privacy-policy">Privacidad</a> | 
      <a href="https://naiqo.es/terms-of-service">Términos</a> | 
      <a href="${unsubscribeUrl}">Cancelar suscripción</a>
    </p>
    <p>© ${new Date().getFullYear()} NAIQO. Todos los derechos reservados.</p>
  </div>
`;

export const emailTemplates = {
  // EMAIL 1 - Welcome (immediate on signup)
  welcome: (data: { name: string; trialEndDate: string; appUrl: string }) => ({
    subject: '🎉 ¡Bienvenida a NAIQO! Tus 7 días gratis empiezan ahora',
    html: wrapTemplate(`
      <div class="header">
        <h1>💅 NAIQO</h1>
      </div>
      <div class="content">
        <h2>¡Hola ${data.name}! 🎉</h2>
        <p>¡Gracias por registrarte! Tienes <strong>7 días para probar NAIQO sin límites</strong>.</p>
        
        <p>Aquí van 3 consejos para aprovechar al máximo tu prueba:</p>
        
        <div class="feature-box">
          <h3>📸 1. Haz tu primer análisis ahora</h3>
          <p>Sube una foto de uñas y obtén un diagnóstico en segundos</p>
        </div>
        <a href="${data.appUrl}/nail-analysis" class="cta-button">Analizar primera foto</a>
        
        <div class="feature-box">
          <h3>💬 2. Pregunta al asistente IA</h3>
          <p>Prueba: "¿Qué productos necesito para uñas quebradizas?"</p>
        </div>
        
        <div class="feature-box">
          <h3>📅 3. Configura tu primera cita</h3>
          <p>Ahorra tiempo con recordatorios automáticos</p>
        </div>
        
        <div class="divider"></div>
        
        <p>¿Necesitas ayuda? <strong>Responde este email</strong> y te atenderemos personalmente.</p>
        
        <p>¡A disfrutar! 💜</p>
        <p><strong>El equipo NAIQO</strong></p>
        
        <div class="ps-note">
          <strong>P.D.</strong> Tu prueba termina el <strong>${data.trialEndDate}</strong>. Sin compromisos, sin tarjeta.
        </div>
      </div>
      ${footer()}
    `)
  }),

  // EMAIL 2 - Day 3 of trial
  trialDay3: (data: { name: string; analysisCount: number; clientsHelped: number; appUrl: string }) => ({
    subject: `📊 Has hecho ${data.analysisCount} análisis. Aquí está tu impacto...`,
    html: wrapTemplate(`
      <div class="header">
        <h1>💅 NAIQO</h1>
      </div>
      <div class="content">
        <h2>¡Increíble progreso, ${data.name}! 🚀</h2>
        <p>Llevas 3 días usando NAIQO y ya estás viendo resultados:</p>
        
        <div style="display: flex; gap: 20px; margin: 30px 0;">
          <div class="stats-box" style="flex: 1;">
            <div class="number">${data.analysisCount}</div>
            <div class="label">Análisis realizados</div>
          </div>
          <div class="stats-box" style="flex: 1;">
            <div class="number">${data.clientsHelped}</div>
            <div class="label">Clientas ayudadas</div>
          </div>
        </div>
        
        <p>Cada análisis es una clienta que confía más en ti. ¡Sigue así!</p>
        
        <div class="feature-box">
          <h3>💡 Tip del día</h3>
          <p>¿Sabías que puedes guardar el historial de cada clienta? Así podrás ver su evolución en cada visita.</p>
        </div>
        
        <a href="${data.appUrl}/dashboard" class="cta-button">Ver mi progreso completo</a>
        
        <div class="divider"></div>
        
        <p>¿Tienes dudas? Responde este email.</p>
        <p><strong>El equipo NAIQO</strong></p>
      </div>
      ${footer()}
    `)
  }),

  // EMAIL 3 - Day 5 of trial
  trialDay5: (data: { name: string; daysLeft: number; appUrl: string }) => ({
    subject: `⏰ Quedan ${data.daysLeft} días de prueba. ¿Listo para continuar?`,
    html: wrapTemplate(`
      <div class="header">
        <h1>💅 NAIQO</h1>
      </div>
      <div class="content">
        <h2>Hola ${data.name} 👋</h2>
        <p>Tu prueba gratuita termina en <strong>${data.daysLeft} días</strong>.</p>
        
        <p>Queremos asegurarnos de que hayas probado todo:</p>
        
        <div class="feature-box">
          <h3>✅ Análisis de uñas con IA</h3>
          <p>Diagnósticos profesionales en segundos</p>
        </div>
        
        <div class="feature-box">
          <h3>✅ Asistente conversacional</h3>
          <p>Respuestas expertas 24/7</p>
        </div>
        
        <div class="feature-box">
          <h3>✅ Gestión de citas</h3>
          <p>Recordatorios automáticos para tus clientas</p>
        </div>
        
        <div class="feature-box">
          <h3>✅ Predicción de demanda</h3>
          <p>Anticipa qué productos necesitarás</p>
        </div>
        
        <a href="${data.appUrl}/subscribe" class="cta-button">Ver planes y precios</a>
        
        <div class="divider"></div>
        
        <p>Si decides continuar, tus datos y configuración se mantienen. Si no, no te preocupes - puedes volver cuando quieras.</p>
        
        <p><strong>El equipo NAIQO</strong></p>
      </div>
      ${footer()}
    `)
  }),

  // EMAIL 4 - Last day of trial
  trialLastDay: (data: { name: string; discountCode: string; appUrl: string }) => ({
    subject: '🚨 Tu prueba termina mañana. Elige tu plan y obtén 20% OFF',
    html: wrapTemplate(`
      <div class="header">
        <h1>💅 NAIQO</h1>
      </div>
      <div class="content">
        <h2>⏰ ¡Última oportunidad, ${data.name}!</h2>
        <p>Tu prueba gratuita <strong>termina mañana</strong>.</p>
        
        <div class="success-box">
          <p>🎁 <strong>Oferta especial:</strong> Usa el código <strong>${data.discountCode}</strong> para obtener un <strong>20% de descuento</strong> en tu primer mes.</p>
        </div>
        
        <p>No pierdas todo el progreso que has hecho:</p>
        <ul style="color: #4a4a4a;">
          <li>Tus análisis guardados</li>
          <li>El historial de tus clientas</li>
          <li>Tus configuraciones personalizadas</li>
        </ul>
        
        <a href="${data.appUrl}/subscribe?code=${data.discountCode}" class="cta-button">Elegir mi plan con 20% OFF</a>
        
        <div class="divider"></div>
        
        <p>El descuento expira en 24 horas. ¿Tienes preguntas? Escríbenos.</p>
        
        <p><strong>El equipo NAIQO</strong></p>
      </div>
      ${footer()}
    `)
  }),

  // EMAIL 5 - Trial expired
  trialExpired: (data: { name: string; appUrl: string }) => ({
    subject: 'Tu prueba ha terminado. Tus datos están seguros y esperándote',
    html: wrapTemplate(`
      <div class="header">
        <h1>💅 NAIQO</h1>
      </div>
      <div class="content">
        <h2>Hola ${data.name} 💜</h2>
        <p>Tu prueba gratuita de NAIQO ha terminado.</p>
        
        <div class="feature-box">
          <h3>🔒 Tus datos están seguros</h3>
          <p>Guardamos todos tus análisis e historial de clientas durante 30 días. Cuando reactives tu cuenta, todo estará exactamente como lo dejaste.</p>
        </div>
        
        <p>Cuando estés lista para volver:</p>
        
        <a href="${data.appUrl}/subscribe" class="cta-button">Reactivar mi cuenta</a>
        
        <div class="divider"></div>
        
        <p>¿El precio es un problema? Cuéntanos tu situación respondiendo este email. Queremos ayudarte.</p>
        
        <p>Te echamos de menos 💜</p>
        <p><strong>El equipo NAIQO</strong></p>
      </div>
      ${footer()}
    `)
  }),

  // EMAIL 6 - Subscription activated
  subscriptionActivated: (data: { name: string; planName: string; nextBillingDate: string; appUrl: string }) => ({
    subject: '🎊 ¡Bienvenida al equipo NAIQO Premium!',
    html: wrapTemplate(`
      <div class="header">
        <h1>💅 NAIQO</h1>
      </div>
      <div class="content">
        <h2>🎊 ¡Bienvenida, ${data.name}!</h2>
        <p>Ahora eres parte del equipo <strong>NAIQO ${data.planName}</strong>. ¡Gracias por confiar en nosotros!</p>
        
        <div class="success-box">
          <p>✅ Tu suscripción está activa. Tienes acceso completo a todas las funciones.</p>
        </div>
        
        <p>Esto es lo que tienes ahora:</p>
        <ul style="color: #4a4a4a;">
          <li>✨ Análisis ilimitados de uñas</li>
          <li>💬 Asistente IA disponible 24/7</li>
          <li>📅 Gestión de citas con recordatorios</li>
          <li>📊 Predicción de demanda avanzada</li>
          <li>📧 Soporte prioritario</li>
        </ul>
        
        <a href="${data.appUrl}/dashboard" class="cta-button">Ir a mi Dashboard</a>
        
        <div class="divider"></div>
        
        <p style="font-size: 14px; color: #666;">Tu próxima factura será el <strong>${data.nextBillingDate}</strong>. Puedes gestionar tu suscripción desde tu cuenta.</p>
        
        <p>¡A hacer crecer tu salón! 🚀</p>
        <p><strong>El equipo NAIQO</strong></p>
      </div>
      ${footer()}
    `)
  }),

  // EMAIL 7 - Payment reminder (3 days before)
  paymentReminder: (data: { name: string; amount: string; billingDate: string; appUrl: string }) => ({
    subject: `Tu próximo pago de ${data.amount} es el ${data.billingDate}`,
    html: wrapTemplate(`
      <div class="header">
        <h1>💅 NAIQO</h1>
      </div>
      <div class="content">
        <h2>Hola ${data.name} 👋</h2>
        <p>Te recordamos que tu próximo pago está programado:</p>
        
        <div class="stats-box">
          <div class="number">${data.amount}</div>
          <div class="label">${data.billingDate}</div>
        </div>
        
        <p>Asegúrate de que tu método de pago esté actualizado para evitar interrupciones en el servicio.</p>
        
        <a href="${data.appUrl}/account" class="cta-button">Revisar método de pago</a>
        
        <div class="divider"></div>
        
        <p style="font-size: 14px; color: #666;">Si tienes alguna pregunta sobre tu factura, responde este email.</p>
        
        <p><strong>El equipo NAIQO</strong></p>
      </div>
      ${footer()}
    `)
  }),

  // EMAIL 8 - Payment failed
  paymentFailed: (data: { name: string; amount: string; appUrl: string }) => ({
    subject: '⚠️ Problema con tu pago. Actualiza tu tarjeta',
    html: wrapTemplate(`
      <div class="header">
        <h1>💅 NAIQO</h1>
      </div>
      <div class="content">
        <h2>Hola ${data.name}</h2>
        
        <div class="warning-box">
          <p>⚠️ <strong>No pudimos procesar tu pago de ${data.amount}.</strong></p>
        </div>
        
        <p>Esto puede ocurrir por:</p>
        <ul style="color: #4a4a4a;">
          <li>Tarjeta expirada o cancelada</li>
          <li>Fondos insuficientes</li>
          <li>Límite de crédito alcanzado</li>
        </ul>
        
        <p>Para mantener tu acceso a NAIQO, por favor actualiza tu método de pago:</p>
        
        <a href="${data.appUrl}/account" class="cta-button">Actualizar tarjeta ahora</a>
        
        <div class="divider"></div>
        
        <p style="font-size: 14px; color: #666;">Intentaremos cobrar nuevamente en 3 días. Si el problema persiste, tu cuenta será suspendida temporalmente.</p>
        
        <p>¿Necesitas ayuda? Responde este email.</p>
        
        <p><strong>El equipo NAIQO</strong></p>
      </div>
      ${footer()}
    `)
  })
};

export type EmailType = keyof typeof emailTemplates;
