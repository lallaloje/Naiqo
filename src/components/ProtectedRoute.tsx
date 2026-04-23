import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Onboarding } from '@/pages/Onboarding';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Routes allowed when subscription is expired
const ALLOWED_EXPIRED_ROUTES = ['/subscribe', '/account', '/planes'];

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isDemoMode } = useDemoMode();
  const location = useLocation();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      // Skip all checks if in demo mode
      if (isDemoMode) {
        setCheckingSubscription(false);
        setOnboardingChecked(true);
        setSubscriptionStatus('active');
        return;
      }

      if (!user) {
        setCheckingSubscription(false);
        setOnboardingChecked(true);
        return;
      }

      const { data: salon, error } = await supabase
        .from('salons')
        .select('subscription_status, trial_ends_at, onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !salon) {
        setCheckingSubscription(false);
        setOnboardingChecked(true);
        return;
      }

      // Check onboarding status
      if (!salon.onboarding_completed) {
        setShowOnboarding(true);
      }
      setOnboardingChecked(true);

      const today = new Date();
      const trialEndsAt = new Date(salon.trial_ends_at);
      
      // If trial has expired but status is still 'trial', update to 'expired'
      if (salon.subscription_status === 'trial' && trialEndsAt < today) {
        await supabase
          .from('salons')
          .update({ subscription_status: 'expired' })
          .eq('user_id', user.id);
        
        setSubscriptionStatus('expired');
        toast({
          title: "Prueba finalizada",
          description: "Tu prueba gratuita ha finalizado. Elige un plan para continuar.",
          variant: "destructive",
        });
      } else {
        setSubscriptionStatus(salon.subscription_status);
      }

      setCheckingSubscription(false);
    };

    checkSubscription();
  }, [user, isDemoMode]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  // In demo mode, allow immediate access
  if (isDemoMode) {
    return <>{children}</>;
  }

  if (authLoading || checkingSubscription || !onboardingChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if subscription is expired and route is not allowed
  if (subscriptionStatus === 'expired') {
    const isAllowedRoute = ALLOWED_EXPIRED_ROUTES.some(route => 
      location.pathname.startsWith(route)
    );
    
    if (!isAllowedRoute) {
      return <Navigate to="/subscribe" replace />;
    }
  }

  return (
    <>
      {showOnboarding && (
        <Onboarding 
          onComplete={handleOnboardingComplete} 
          onSkip={handleOnboardingSkip} 
        />
      )}
      {children}
    </>
  );
};

export default ProtectedRoute;
