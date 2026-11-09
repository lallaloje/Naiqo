import React from 'react';
import { useNavigate } from 'react-router-dom';
import SmartAppointments from '@/components/SmartAppointments';
import { MobileLayout } from '@/components/MobileLayout';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft } from 'lucide-react';

const AppointmentManagement = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Mobile: layout propio con flex columna fixed para scroll correcto
  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--background)',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 56,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid hsl(var(--border))',
            backgroundColor: 'hsl(var(--background) / 0.95)',
            backdropFilter: 'blur(8px)',
            gap: 8,
          }}
        >
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/dashboard')}
            style={{ padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center' }}
            aria-label="Volver"
          >
            <ArrowLeft style={{ width: 24, height: 24 }} />
          </button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Gestión de Citas</span>
        </div>

        {/* Scroll container — flex:1 min-h-0 + touch-action:pan-y para scroll inmediato */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'scroll',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          } as React.CSSProperties}
        >
          <SmartAppointments />
        </div>

        {/* Bottom nav */}
        <MobileNavigation />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="pt-20">
        <SmartAppointments />
      </main>
      <Footer />
    </div>
  );
};

export default AppointmentManagement;
