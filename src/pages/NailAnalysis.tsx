import React from 'react';
import NailHealthAnalyzer from '@/components/NailHealthAnalyzer';
import { MobileLayout } from '@/components/MobileLayout';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useIsMobile } from '@/hooks/use-mobile';

const NailAnalysis = () => {
  const isMobile = useIsMobile();

  // Mobile layout with bottom nav
  if (isMobile) {
    return (
      <MobileLayout title="Análisis" showBack={true}>
        <div className="p-4">
          <NailHealthAnalyzer />
        </div>
      </MobileLayout>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="pt-20">
        <NailHealthAnalyzer />
      </main>
      <Footer />
    </div>
  );
};

export default NailAnalysis;
