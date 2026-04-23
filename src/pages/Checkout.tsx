import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Check, Loader2, Shield, Star, Sparkles, Zap, Crown } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { logError } from '@/lib/logger';

interface PlanInfo {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  icon: typeof Zap;
  features: string[];
  variant: 'basic' | 'professional' | 'premium';
}

const plans: Record<string, PlanInfo> = {
  basico: {
    id: 'basico',
    name: 'Básico',
    monthlyPrice: 39,
    annualPrice: 31,
    icon: Zap,
    features: [
      '100 análisis/mes',
      'Asistente IA básico',
      'Recomendador de tratamientos',
      'Historial de análisis',
    ],
    variant: 'basic',
  },
  profesional: {
    id: 'profesional',
    name: 'Profesional',
    monthlyPrice: 79,
    annualPrice: 63,
    icon: Crown,
    features: [
      '500 análisis/mes',
      'Todo lo del plan Básico',
      'Gestión de citas avanzada',
      'Predicción de stock',
      'Reportes avanzados',
    ],
    variant: 'professional',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 149,
    annualPrice: 119,
    icon: Sparkles,
    features: [
      'Análisis ilimitados',
      'Todo lo del plan Profesional',
      'Soporte prioritario 24/7',
      'Formación personalizada 1-1',
      'Acceso API completo',
    ],
    variant: 'premium',
  },
};

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const planId = searchParams.get('plan') || 'profesional';
  const billingParam = searchParams.get('billing') || 'monthly';
  
  const [billing, setBilling] = useState<'monthly' | 'annual'>(
    billingParam === 'annual' ? 'annual' : 'monthly'
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const plan = plans[planId] || plans.profesional;
  const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const totalAnnual = billing === 'annual' ? price * 12 : price * 12;
  const savings = billing === 'annual' ? (plan.monthlyPrice * 12) - (plan.annualPrice * 12) : 0;

  const handleCheckout = async () => {
    if (!termsAccepted) {
      toast({
        title: "Términos requeridos",
        description: "Debes aceptar los términos y condiciones para continuar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId: plan.id, billing },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió la URL de pago');
      }
    } catch (err) {
      logError('Checkout error', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo procesar el pago. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCardBorderColor = (variant: 'basic' | 'professional' | 'premium') => {
    switch (variant) {
      case 'basic':
        return 'border-slate-300 dark:border-slate-600';
      case 'professional':
        return 'border-purple-400 dark:border-purple-600';
      case 'premium':
        return 'border-amber-400 dark:border-amber-600';
    }
  };

  const getIconBg = (variant: 'basic' | 'professional' | 'premium') => {
    switch (variant) {
      case 'basic':
        return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
      case 'professional':
        return 'bg-gradient-to-r from-purple-600 to-pink-500 text-white';
      case 'premium':
        return 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate('/subscribe')}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a planes
        </Button>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center text-foreground mb-2">
            Confirmar suscripción
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Estás a un paso de desbloquear todo el potencial de NAIQO
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Plan Summary */}
            <Card className={`${getCardBorderColor(plan.variant)} border-2`}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getIconBg(plan.variant)}`}>
                    <plan.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">Plan seleccionado</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Billing Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={billing === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBilling('monthly')}
                    className={billing === 'monthly' ? 'bg-primary' : ''}
                  >
                    Mensual
                  </Button>
                  <Button
                    variant={billing === 'annual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBilling('annual')}
                    className={billing === 'annual' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    Anual (-20%)
                  </Button>
                </div>

                {/* Price Display */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-muted-foreground">Precio {billing === 'annual' ? 'anual' : 'mensual'}</span>
                    <span className="text-3xl font-bold text-foreground">
                      €{price}
                      <span className="text-lg font-normal text-muted-foreground">/mes</span>
                    </span>
                  </div>
                  {billing === 'annual' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 dark:text-green-400">
                        <Sparkles className="w-4 h-4 inline mr-1" />
                        Ahorras €{savings}/año
                      </span>
                      <span className="text-muted-foreground">
                        Total: €{totalAnnual}/año
                      </span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Checkout Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Pago seguro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">🔒 Pago seguro con Stripe</p>
                  <p>Serás redirigido a una página segura de Stripe para completar el pago. Tus datos de tarjeta nunca pasan por nuestros servidores.</p>
                </div>

                {/* Order Summary */}
                <div className="border-t border-b py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan {plan.name}</span>
                    <span>€{plan.monthlyPrice}/mes</span>
                  </div>
                  {billing === 'annual' && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Descuento anual (20%)</span>
                      <span>-€{(plan.monthlyPrice - plan.annualPrice)}/mes</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total {billing === 'annual' ? 'anual' : 'mensual'}</span>
                    <span>€{billing === 'annual' ? totalAnnual : price}</span>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    Acepto los{' '}
                    <a href="/terminos" target="_blank" className="text-primary hover:underline">
                      términos y condiciones
                    </a>{' '}
                    y la{' '}
                    <a href="/privacidad" target="_blank" className="text-primary hover:underline">
                      política de privacidad
                    </a>
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-lg py-6"
                  onClick={handleCheckout}
                  disabled={loading || !termsAccepted}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Star className="mr-2 h-5 w-5" />
                      Confirmar suscripción €{price}/mes
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Puedes cancelar en cualquier momento desde tu cuenta
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
