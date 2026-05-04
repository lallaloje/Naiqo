import React from 'react';
import ConversationalAssistant from '@/components/ConversationalAssistant';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useIsMobile } from '@/hooks/use-mobile';

const ChatAssistant = () => {
  const isMobile = useIsMobile();

  // Móvil: pantalla completa sin MobileLayout
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg, #fdf4fb 0%, #f3e8ff 100%)',
        zIndex: 50,
        overflow: 'hidden',
      }}>
        {/* Mini top bar */}
        <div style={{
          background: 'linear-gradient(135deg, #e879a0, #a855f7)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>💅</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0, lineHeight: 1.2 }}>
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

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ConversationalAssistant />
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="pt-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Asistente Conversacional
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Especializado</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Consulta con Sofia, nuestra experta en salud ungueal con inteligencia artificial
          </p>
        </div>
        <ConversationalAssistant />
      </main>
      <Footer />
    </div>
  );
};

export default ChatAssistant;
