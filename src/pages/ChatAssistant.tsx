import React, { useEffect } from 'react';
import ConversationalAssistant from '@/components/ConversationalAssistant';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileLayout } from '@/components/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

const ChatAssistant = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // En móvil: abrir la burbuja flotante y mostrar pantalla informativa con navegación
  if (isMobile) {
    return (
      <MobileLayout title="Sofia — Asistente" showBack={true}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg"
            style={{ background: 'linear-gradient(135deg, #e879a0, #a855f7)' }}>
            💅
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">Sofia — Asistente NAIQO</h2>
            <p className="text-muted-foreground text-sm">Experta en salud ungueal</p>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Pulsa el botón rosa en la esquina inferior derecha para chatear con Sofia desde cualquier pantalla de la app.
          </p>
          <div className="flex items-center gap-2 bg-pink-50 border border-pink-200 rounded-2xl px-4 py-3 text-sm text-pink-700">
            <MessageCircle className="w-4 h-4 shrink-0" />
            La burbuja de chat está siempre disponible en toda la aplicación
          </div>
        </div>
      </MobileLayout>
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
