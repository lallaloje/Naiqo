import SmartAppointments from '@/components/SmartAppointments';
import { MobileLayout } from '@/components/MobileLayout';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useIsMobile } from '@/hooks/use-mobile';

const AppointmentManagement = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileLayout title="Gestión de Citas" showBack>
        <SmartAppointments />
      </MobileLayout>
    );
  }

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
