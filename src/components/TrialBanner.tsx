import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

interface SalonData {
  trial_ends_at: string;
  subscription_status: string;
}

export const TrialBanner = () => {
  const [salonData, setSalonData] = useState<SalonData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSalonData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('salons')
        .select('trial_ends_at, subscription_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setSalonData(data);
      }
      setLoading(false);
    };

    fetchSalonData();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (loading || !isVisible || !salonData) return null;
  
  // Don't show if subscription is active
  if (salonData.subscription_status === 'active') return null;

  const today = new Date();
  const trialEndsAt = new Date(salonData.trial_ends_at);
  const daysRemaining = differenceInDays(trialEndsAt, today);
  const isTrialExpired = daysRemaining <= 0 && salonData.subscription_status === 'trial';
  const isInTrial = daysRemaining > 0;

  // Don't show banner if neither in trial nor expired
  if (!isInTrial && !isTrialExpired) return null;

  return (
    <div className="sticky top-0 z-50 w-full animate-fade-in">
      <div className="relative bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 px-4 py-3 text-center text-white shadow-lg">
        <div className="flex items-center justify-center gap-3">
          {isTrialExpired ? (
            <>
              <span className="text-sm font-medium sm:text-base">
                ⚠️ Tu prueba gratuita ha terminado.
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-purple-600 hover:bg-gray-100 font-semibold animate-pulse"
                onClick={() => navigate('/planes')}
              >
                Suscríbete ahora
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm font-medium sm:text-base">
                🎉 Prueba gratuita: te quedan {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-purple-600 hover:bg-gray-100 font-semibold"
                onClick={() => navigate('/planes')}
              >
                Ver planes
              </Button>
            </>
          )}
        </div>
        
        <button
          onClick={handleClose}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Cerrar banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
