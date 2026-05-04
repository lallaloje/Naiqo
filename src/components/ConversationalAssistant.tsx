import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const RELEVANCE_URL = "https://app.relevanceai.com/agents/d7b62b/cfa356af-ce01-43c2-9b72-3108989f04d1/b57fb9a8-8f82-4932-80fd-2c44337080e2/embed-chat?starting_message_prompts=%C2%BFEn+que+me+puedes+ayudar%3F&starting_message_prompts=%C2%BFC%C3%B3mo+puedo+programar+una+cita%3F&starting_message_prompts=Expl%C3%ADcame+como+funciona+el+an%C3%A1lisis+de+salud+ungueal&hide_tool_steps=true&hide_file_uploads=true&hide_conversation_list=true&bubble_style=agent&primary_color=%23FF1F8E&bubble_icon=pd%2Fchat&input_placeholder_text=Escribe+tu+consulta&hide_logo=true&hide_description=false";

interface ConversationalAssistantProps {
  contextType?: string;
  relatedAnalysisId?: string;
  initialMessage?: string;
}

const Header = () => (
  <div style={{
    background: 'linear-gradient(135deg, #e879a0, #a855f7)',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  }}>
    <div style={{ position: 'relative' }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>💅</div>
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 10, height: 10, borderRadius: '50%',
        background: '#4ade80', border: '2px solid white',
      }} />
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0, lineHeight: 1.2 }}>
        Sofia — Asistente NAIQO
      </p>
      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0 }}>
        Experta en salud ungueal · En línea
      </p>
    </div>
    <span style={{
      fontSize: 11, background: 'rgba(255,255,255,0.2)',
      color: 'white', padding: '3px 8px', borderRadius: 20,
    }}>● Activa</span>
  </div>
);

const ConversationalAssistant: React.FC<ConversationalAssistantProps> = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header />
        <iframe
          src={RELEVANCE_URL}
          style={{ flex: 1, width: '100%', border: 'none' }}
          allow="microphone; clipboard-read; clipboard-write"
          title="Sofia - Asistente NAIQO"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div
        className="rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/20 flex flex-col"
        style={{ height: '75vh' }}
      >
        <Header />
        <iframe
          src={RELEVANCE_URL}
          style={{ flex: 1, width: '100%', border: 'none', minHeight: 0 }}
          allow="microphone; clipboard-read; clipboard-write"
          title="Sofia - Asistente NAIQO"
        />
      </div>
    </div>
  );
};

export default ConversationalAssistant;
