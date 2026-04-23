import React from 'react';
import SmartAppointments from '@/components/SmartAppointments';
import { MobileLayout } from '@/components/MobileLayout';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useIsMobile } from '@/hooks/use-mobile';

const AppointmentManagement = () => {
  const isMobile = useIsMobile();

  // Mobile layout
  if (isMobile) {
    return (
      <MobileLayout title="Gestión de Citas" showBack={true}>
        <div className="p-4">
          <SmartAppointments />
        </div>
      </MobileLayout>
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
