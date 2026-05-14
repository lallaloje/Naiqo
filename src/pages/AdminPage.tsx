import React, { useEffect, useState } from 'react';
import AdminPanel from '@/components/AdminPanel';
import { MobileLayout } from '@/components/MobileLayout';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AdminPage = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin]   = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('is_admin').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(data?.is_admin === true));
  }, [user]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  if (isMobile) {
    return (
      <MobileLayout title="Admin" showBack={true}>
        <AdminPanel />
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="pt-20">
        <AdminPanel />
      </main>
      <Footer />
    </div>
  );
};

export default AdminPage;
