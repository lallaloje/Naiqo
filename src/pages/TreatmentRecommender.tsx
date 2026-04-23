import React from 'react';
import HybridRecommender from '@/components/HybridRecommender';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const TreatmentRecommender = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="pt-20">
        <HybridRecommender />
      </main>
      <Footer />
    </div>
  );
};

export default TreatmentRecommender;