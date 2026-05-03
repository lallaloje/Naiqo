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
        background: '#fff',
        zIndex: 50,
      }}>
        <ConversationalAssistant />
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
