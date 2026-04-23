import React from 'react';
import ConversationalAssistant from '@/components/ConversationalAssistant';
import { MobileLayout } from '@/components/MobileLayout';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useIsMobile } from '@/hooks/use-mobile';

const ChatAssistant = () => {
  const isMobile = useIsMobile();

  // Mobile layout - full screen chat
  if (isMobile) {
    return (
      <MobileLayout title="Asistente Sofia" showBack={true}>
        <div className="h-full">
          <ConversationalAssistant />
        </div>
      </MobileLayout>
    );
  }

  // Desktop layout
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
