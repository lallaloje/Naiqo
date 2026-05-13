import React from 'react';
import EmployeesSection from '@/components/EmployeesSection';
import { MobileLayout } from '@/components/MobileLayout';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useIsMobile } from '@/hooks/use-mobile';

const EmployeesPage = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileLayout title="Equipo" showBack={true}>
        <div className="p-4">
          <EmployeesSection />
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="pt-20">
        <EmployeesSection />
      </main>
      <Footer />
    </div>
  );
};

export default EmployeesPage;
