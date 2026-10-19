import React from 'react';
import HybridRecommender from '@/components/HybridRecommender';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TreatmentRecommender = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 gap-1 mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver
          </Button>
        </div>
        <HybridRecommender />
      </main>
      <Footer />
    </div>
  );
};

export default TreatmentRecommender;