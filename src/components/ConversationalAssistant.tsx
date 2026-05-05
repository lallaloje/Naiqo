import React, { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const SHARE_ID = "d7b62b/cfa356af-ce01-43c2-9b72-3108989f04d1/b57fb9a8-8f82-4932-80fd-2c44337080e2";
const SHARE_STYLES = "starting_message_prompts=%C2%BFEn+que+me+puedes+ayudar%3F&starting_message_prompts=%C2%BFC%C3%B3mo+puedo+programar+una+cita%3F&starting_message_prompts=Expl%C3%ADcame+como+funciona+el+an%C3%A1lisis+de+salud+ungueal&hide_tool_steps=true&hide_file_uploads=true&hide_conversation_list=true&bubble_style=agent&primary_color=%23FF1F8E&bubble_icon=pd%2Fchat&input_placeholder_text=Escribe+tu+consulta&hide_logo=true&hide_description=false";

const SCRIPT_ID = 'relevance-ai-bubble-script';

interface ConversationalAssistantProps {
  contextType?: string;
  relatedAnalysisId?: string;
  initialMessage?: string;
}

const ConversationalAssistant: React.FC<ConversationalAssistantProps> = () => {
  const isMobile = useIsMobile();

  useEffect(() => {
    // Limpiar cualquier sesión corrupta de Relevance AI guardada en localStorage
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.toLowerCase().includes('relevance') || key.toLowerCase().includes('rai_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}

    // Avoid injecting twice
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.defer = true;
    script.setAttribute('data-relevanceai-share-id', SHARE_ID);
    script.src = 'https://app.relevanceai.com/embed/chat-bubble.js';
    script.setAttribute('data-share-styles', SHARE_STYLES);
    document.body.appendChild(script);

    // Auto-open the bubble after a short delay so it has time to render
    const timer = setTimeout(() => {
      // Try to find and click the bubble button to open chat automatically
      const bubble = document.querySelector<HTMLElement>(
        'button[data-relevanceai], .relevanceai-bubble-btn, [id*="relevance"] button, relevance-chat-bubble'
      );
      if (bubble) bubble.click();
    }, 1500);

    return () => {
      clearTimeout(timer);
      // Remove script
      const scriptEl = document.getElementById(SCRIPT_ID);
      if (scriptEl) scriptEl.remove();
      // Remove any injected widget elements
      document.querySelectorAll(
        '[data-relevanceai], relevance-chat-bubble, #relevance-chat-widget, .relevanceai-bubble-container'
      ).forEach(el => el.remove());
      // Cleanup any shadow-host divs injected by the script
      document.querySelectorAll('div[style*="z-index: 9999"]').forEach(el => {
        if ((el as HTMLElement).dataset.relevanceai !== undefined) el.remove();
      });
    };
  }, []);

  // ── Mobile: full-screen landing that tells the user to tap the bubble ──
  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '32px 24px',
        background: 'linear-gradient(160deg, #fdf4fb 0%, #f3e8ff 100%)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #e879a0, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, marginBottom: 20,
          boxShadow: '0 8px 32px rgba(232,121,160,0.35)',
        }}>💅</div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>
          Sofia — Asistente NAIQO
        </h2>
        <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 32px', lineHeight: 1.5 }}>
          Experta en salud ungueal con inteligencia artificial.<br />
          Toca el botón de chat para empezar.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
          {['¿En qué me puedes ayudar?', '¿Cómo puedo programar una cita?', 'Explícame el análisis de salud ungueal'].map(q => (
            <div key={q} style={{
              background: 'white',
              border: '1.5px solid #f0c0e0',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 13,
              color: '#374151',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              💬 {q}
            </div>
          ))}
        </div>

        <p style={{ marginTop: 40, fontSize: 12, color: '#9ca3af' }}>
          El botón de chat aparecerá en la esquina inferior derecha
        </p>
      </div>
    );
  }

  // ── Desktop: centered card ──
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div
        className="rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/20"
        style={{
          minHeight: '60vh',
          background: 'linear-gradient(160deg, #fdf4fb 0%, #f3e8ff 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
          textAlign: 'center',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: 'linear-gradient(135deg, #e879a0, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 52, marginBottom: 24,
          boxShadow: '0 12px 40px rgba(232,121,160,0.4)',
        }}>💅</div>

        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', margin: '0 0 10px' }}>
          Sofia — Asistente NAIQO
        </h2>
        <p style={{ color: '#6b7280', fontSize: 16, margin: '0 0 40px', maxWidth: 480, lineHeight: 1.6 }}>
          Tu experta en salud ungueal con inteligencia artificial. Pregúntame sobre tratamientos,
          cómo interpretar tu análisis o cómo gestionar tus citas.
        </p>

        {/* Sample prompts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 600 }}>
          {[
            '¿En qué me puedes ayudar?',
            '¿Cómo puedo programar una cita?',
            'Explícame el análisis de salud ungueal',
          ].map(q => (
            <div key={q} style={{
              background: 'white',
              border: '1.5px solid #f0c0e0',
              borderRadius: 20,
              padding: '10px 18px',
              fontSize: 14,
              color: '#374151',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            }}>
              💬 {q}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#4ade80',
              display: 'inline-block',
            }} />
            Sofia está en línea · Pulsa el botón rosa abajo a la derecha
          </div>
          <button
            onClick={() => {
              // Limpiar caché de Relevance AI y recargar
              try {
                Object.keys(localStorage).forEach(key => {
                  if (key.toLowerCase().includes('relevance') || key.toLowerCase().includes('rai_')) {
                    localStorage.removeItem(key);
                  }
                });
                Object.keys(sessionStorage).forEach(key => {
                  if (key.toLowerCase().includes('relevance') || key.toLowerCase().includes('rai_')) {
                    sessionStorage.removeItem(key);
                  }
                });
              } catch (_) {}
              window.location.reload();
            }}
            style={{
              fontSize: 12,
              color: '#e879a0',
              background: 'none',
              border: '1px solid #f0c0e0',
              borderRadius: 20,
              padding: '6px 14px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            🔄 ¿Chat congelado? Reiniciar conversación
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationalAssistant;
