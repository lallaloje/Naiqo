import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Check, ArrowLeft, Star, Sparkles, Zap, Crown } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SalonData {
  subscription_status: string;
  trial_ends_at: string;
}

const plans = [
  {
    id: 'basico',
    name: 'Básico',
    monthlyPrice: 39,
    description: 'Perfecto para empezar',
    icon: Zap,
    features: [
      '100 análisis/mes',
      'Asistente IA básico',
      'Recomendador de tratamientos',
      'Historial de análisis',
    ],
    popular: false,
    variant: 'basic' as const,
  },
  {
    id: 'profesional',
    name: 'Profesional',
    monthlyPrice: 79,
    description: 'Ideal para salones en crecimiento',
    icon: Crown,
    features: [
      '500 análisis/mes',
      'Todo lo del plan Básico',
      'Gestión de citas avanzada',
      'Predicción de stock',
      'Reportes avanzados',
    ],
    popular: true,
    variant: 'professional' as const,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 149,
    description: 'Para grandes cadenas',
    icon: Sparkles,
    features: [
      'Análisis ilimitados',
      'Todo lo del plan Profesional',
      'Soporte prioritario 24/7',
      'Formación personalizada 1-1',
      'Acceso API completo',
    ],
    popular: false,
    variant: 'premium' as const,
  },
];

const faqs = [
  {
    question: '¿Puedo cambiar de plan en cualquier momento?',
    answer: 'Sí, puedes cambiar de plan cuando quieras. Si subes de plan, el cambio es inmediato. Si bajas de plan, el cambio se aplicará en tu próximo ciclo de facturación.',
  },
  {
    question: '¿Qué pasa si cancelo mi suscripción?',
    answer: 'Si cancelas, mantendrás el acceso hasta el final de tu período de facturación actual. Tus datos se conservarán durante 30 días por si decides volver.',
  },
  {
    question: '¿Ofrecen descuentos para múltiples salones?',
    answer: 'Sí, ofrecemos descuentos especiales para cadenas con múltiples ubicaciones. Contáctanos para obtener una cotización personalizada.',
  },
  {
    question: '¿Hay algún compromiso de permanencia?',
    answer: 'No, puedes cancelar en cualquier momento sin penalización. Si cancelas, mantendrás el acceso hasta el fin del período pagado.',
  },
  {
    question: '¿Cómo funciona la facturación anual?',
    answer: 'Con la facturación anual, pagas por 10 meses y obtienes 2 meses gratis (20% de descuento). El pago se realiza en un solo cargo al inicio.',
  },
];

const Subscribe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [salonData, setSalonData] = useState<SalonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    const fetchSalonData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('salons')
        .select('subscription_status, trial_ends_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setSalonData(data);
      }
      setLoading(false);
    };

    fetchSalonData();
  }, [user]);

  const calculatePrice = (monthlyPrice: number) => {
    if (isAnnual) {
      return Math.round(monthlyPrice * 0.8);
    }
    return monthlyPrice;
  };

  const calculateAnnualSavings = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * 0.2);
  };

  const handleSelectPlan = (planId: string) => {
    localStorage.setItem(
      'naiqo_selected_plan',
      JSON.stringify({
        planId,
        billing: isAnnual ? 'annual' : 'monthly',
        selectedAt: new Date().toISOString(),
      })
    );

    const checkoutPath = `/checkout?plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`;

    if (!user) {
      navigate('/register', { state: { redirectTo: checkoutPath } });
      return;
    }

    navigate(checkoutPath);
  };

  const isExpired = salonData?.subscription_status === 'expired';

  const getCardStyles = (variant: 'basic' | 'professional' | 'premium', isPopular: boolean) => {
    const baseStyles = 'relative transition-all duration-300 hover:shadow-xl overflow-hidden';
    
    switch (variant) {
      case 'basic':
        return `${baseStyles} bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-slate-400`;
      case 'professional':
        return `${baseStyles} bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-purple-300 dark:border-purple-700 shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30 scale-105 z-10`;
      case 'premium':
        return `${baseStyles} bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 border-amber-300 dark:border-amber-700 hover:border-amber-400`;
      default:
        return baseStyles;
    }
  };

  const getButtonStyles = (variant: 'basic' | 'professional' | 'premium') => {
    switch (variant) {
      case 'basic':
        return 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600';
      case 'professional':
        return 'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white shadow-lg';
      case 'premium':
        return 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg';
      default:
        return '';
    }
  };

  const getIconStyles = (variant: 'basic' | 'professional' | 'premium') => {
    switch (variant) {
      case 'basic':
        return 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
      case 'professional':
        return 'bg-gradient-to-r from-purple-600 to-pink-500 text-white';
      case 'premium':
        return 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        {/* Back button - only show if not expired */}
        {!isExpired && (
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          {isExpired ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive mb-4">
                <span>⚠️</span>
                <span className="text-sm font-medium">Tu prueba gratuita ha finalizado</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Elige un plan para continuar
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Tus datos están seguros. Selecciona un plan para recuperar el acceso completo a todas las funcionalidades de NAIQO.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Planes y precios
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Elige el plan que mejor se adapte a las necesidades de tu salón
              </p>
            </>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Mensual
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            className="data-[state=checked]:bg-purple-600"
          />
          <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Anual
          </span>
          {isAnnual && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              2 meses gratis
            </span>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`${getCardStyles(plan.variant, plan.popular)} flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-semibold px-4 py-1.5 text-center">
                    <Star className="w-3 h-3 inline mr-1" />
                    RECOMENDADO
                  </div>
                </div>
              )}
              
              <CardHeader className={`text-center ${plan.popular ? 'pt-12' : 'pt-6'} pb-4`}>
                <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center ${getIconStyles(plan.variant)}`}>
                  <plan.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground h-7 flex items-center justify-center">{plan.name}</h3>
                <p className="text-sm text-muted-foreground h-10 flex items-center justify-center">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{calculatePrice(plan.monthlyPrice)}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <div className="h-6 flex items-center justify-center">
                  {isAnnual && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Ahorras €{calculateAnnualSavings(plan.monthlyPrice)}/año
                    </p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pb-6 flex flex-col flex-1">
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className={`w-full ${getButtonStyles(plan.variant)}`}
                  size="lg"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {plan.popular && <Star className="w-4 h-4 mr-2" />}
                  Elegir Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Annual savings banner */}
        {!isAnnual && (
          <div className="max-w-2xl mx-auto mt-8 text-center">
            <button 
              onClick={() => setIsAnnual(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">Paga anualmente y ahorra hasta €358 (2 meses gratis)</span>
            </button>
          </div>
        )}

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">
            Preguntas frecuentes
          </h2>
          
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            ¿Tienes más preguntas?{' '}
            <a href="mailto:soporte@naiqo.com" className="text-primary hover:underline">
              Contáctanos
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Subscribe;
