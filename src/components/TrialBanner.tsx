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
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('salons')
        .select('trial_ends_at, subscription_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) setSalonData(data);
      setLoading(false);
    };

    fetchSalonData();
  }, []);

  if (loading || !isVisible || !salonData) return null;

  // Active subscription — no banner
  if (salonData.subscription_status === 'active') return null;

  const today = new Date();
  const endsAt = new Date(salonData.trial_ends_at);
  const daysRemaining = differenceInDays(endsAt, today);
  const isBeta = salonData.subscription_status === 'beta';
  const isExpired = daysRemaining <= 0;
  const isActive = daysRemaining > 0;

  if (!isActive && !isExpired) return null;

  // ── Beta styling ──────────────────────────────────────────────────────────
  if (isBeta) {
    return (
      <div className="sticky top-0 z-50 w-full animate-fade-in">
        <div className="relative bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600 px-4 py-3 text-center text-white shadow-lg">
          <div className="flex items-center justify-center gap-3">
            {isExpired ? (
              <>
                <span className="text-sm font-medium sm:text-base">
                  ⏰ Tu período beta ha finalizado.
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white text-indigo-600 hover:bg-gray-100 font-semibold animate-pulse"
                  onClick={() => navigate('/planes')}
                >
                  Ver planes
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm font-medium sm:text-base">
                  🚀 Beta Naiqo — {daysRemaining} {daysRemaining === 1 ? 'día restante' : 'días restantes'}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/40 font-medium"
                  onClick={() => navigate('/planes')}
                >
                  Ver planes
                </Button>
              </>
            )}
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Cerrar banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Legacy trial styling (fallback) ──────────────────────────────────────
  if (salonData.subscription_status !== 'trial') return null;

  return (
    <div className="sticky top-0 z-50 w-full animate-fade-in">
      <div className="relative bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 px-4 py-3 text-center text-white shadow-lg">
        <div className="flex items-center justify-center gap-3">
          {isExpired ? (
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
          onClick={() => setIsVisible(false)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Cerrar banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
