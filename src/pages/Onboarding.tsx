import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Sparkles, 
  ArrowRight, 
  Camera, 
  MessageCircle, 
  History, 
  CalendarDays,
  Upload,
  Image,
  CheckCircle,
  X
} from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

type OnboardingStep = 'welcome' | 'config' | 'tour' | 'analysis' | 'complete';

const SERVICES = [
  'Manicura clásica',
  'Manicura semipermanente',
  'Uñas de gel',
  'Uñas acrílicas',
  'Pedicura',
  'Nail art',
  'Tratamientos de hidratación',
  'Extensiones de uñas'
];

export const Onboarding = ({ onComplete, onSkip }: OnboardingProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [tourStep, setTourStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Config data
  const [technicianCount, setTechnicianCount] = useState<string>('');
  const [weeklyClients, setWeeklyClients] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const steps: OnboardingStep[] = ['welcome', 'config', 'tour', 'analysis', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleServiceToggle = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const saveOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('salons')
        .update({
          onboarding_completed: true,
          onboarding_data: {
            technician_count: technicianCount,
            weekly_clients: weeklyClients,
            services: selectedServices,
            completed_at: new Date().toISOString()
          }
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    await saveOnboardingData();
    setIsLoading(false);
    onComplete();
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('salons')
          .update({ onboarding_completed: true })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
    setIsLoading(false);
    onSkip();
  };

  const tourItems = [
    {
      icon: Camera,
      title: 'Análisis de uñas con IA',
      description: 'Sube una foto de la uña de tu clienta y en segundos obtienes un diagnóstico completo.',
      color: 'text-primary',
      preview: (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2 font-medium text-green-600">
            <CheckCircle className="h-4 w-4" /> Resultado del análisis
          </div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Puntuación de salud</span><span className="font-bold text-primary">78/100</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Problema detectado</span><span className="font-medium">Deshidratación leve</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cutículas</span><span className="font-medium text-yellow-600">Necesitan cuidado</span></div>
          </div>
          <div className="pt-1 border-t">
            <p className="text-xs font-medium mb-1">Recomendaciones:</p>
            <p className="text-xs text-muted-foreground">✓ Aceite de cutícula diario</p>
            <p className="text-xs text-muted-foreground">✓ Tratamiento hidratante intensivo</p>
          </div>
        </div>
      )
    },
    {
      icon: MessageCircle,
      title: 'Asistente IA',
      description: 'Consulta dudas sobre tratamientos y condiciones ungueales al instante.',
      color: 'text-blue-500',
      preview: (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex gap-2">
            <div className="bg-muted rounded-lg px-3 py-2 text-xs max-w-[80%]">
              ¿Qué tratamiento recomiendas para uñas frágiles?
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <div className="bg-primary/10 rounded-lg px-3 py-2 text-xs max-w-[80%] text-right">
              Para uñas frágiles recomiendo un tratamiento con queratina y biotina. Evita acetona y usa base fortalecedora en cada servicio. 💅
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-muted rounded-lg px-3 py-2 text-xs max-w-[80%]">
              ¿Cada cuánto tiempo aplicarlo?
            </div>
          </div>
        </div>
      )
    },
    {
      icon: History,
      title: 'Historial de análisis',
      description: 'Guarda el historial de cada clienta para hacer seguimiento de su evolución.',
      color: 'text-green-500',
      preview: (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
          {[
            { name: 'Ana López', date: 'Hoy', issue: 'Uñas saludables', score: 92 },
            { name: 'Carmen Ruiz', date: 'Ayer', issue: 'Onicomicosis leve', score: 65 },
            { name: 'Laura Martínez', date: 'Hace 2 días', issue: 'Deshidratación', score: 78 },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between border-b border-muted pb-1 last:border-0">
              <div>
                <p className="font-medium text-xs">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.date} · {item.issue}</p>
              </div>
              <span className={`text-xs font-bold ${item.score >= 80 ? 'text-green-600' : item.score >= 70 ? 'text-yellow-600' : 'text-red-500'}`}>
                {item.score}/100
              </span>
            </div>
          ))}
        </div>
      )
    },
    {
      icon: CalendarDays,
      title: 'Gestión de citas',
      description: 'Gestiona tu agenda de citas de forma inteligente.',
      color: 'text-purple-500',
      preview: (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
          <p className="text-xs font-medium text-muted-foreground">HOY — LUNES</p>
          {[
            { time: '10:00', client: 'María García', service: 'Gel completo', status: 'Confirmada' },
            { time: '12:00', client: 'Sofía Pérez', service: 'Manicura clásica', status: 'Pendiente' },
            { time: '16:00', client: 'Elena Torres', service: 'Pedicura spa', status: 'Confirmada' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-muted pb-1 last:border-0">
              <span className="text-xs font-bold text-primary w-10">{item.time}</span>
              <div className="flex-1">
                <p className="text-xs font-medium">{item.client}</p>
                <p className="text-xs text-muted-foreground">{item.service}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.status === 'Confirmada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg relative overflow-hidden border-primary/20">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          disabled={isLoading}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>

        <CardContent className="pt-12 pb-8 px-6">
          {/* Step 1: Welcome */}
          {currentStep === 'welcome' && (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">👋 ¡Bienvenida a NAIQO!</h1>
                <p className="text-muted-foreground">
                  Estás en los <span className="text-primary font-semibold">7 días de prueba gratuita</span>.
                </p>
                <p className="text-muted-foreground">
                  Vamos a configurar tu salón en 2 minutos.
                </p>
              </div>
              <Button 
                onClick={() => setCurrentStep('config')} 
                className="w-full"
                size="lg"
              >
                Empezar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Configuration */}
          {currentStep === 'config' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Cuéntanos sobre tu salón</h2>
                <p className="text-sm text-muted-foreground">Esto nos ayuda a personalizar tu experiencia</p>
              </div>

              {/* Technician count */}
              <div className="space-y-3">
                <label className="text-sm font-medium">¿Cuántas técnicas trabajan?</label>
                <div className="grid grid-cols-3 gap-2">
                  {['1-2', '3-5', '6+'].map((option) => (
                    <Button
                      key={option}
                      variant={technicianCount === option ? 'default' : 'outline'}
                      onClick={() => setTechnicianCount(option)}
                      className="w-full"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Weekly clients */}
              <div className="space-y-3">
                <label className="text-sm font-medium">¿Cuántas clientas atiendes/semana?</label>
                <div className="grid grid-cols-3 gap-2">
                  {['<20', '20-50', '50+'].map((option) => (
                    <Button
                      key={option}
                      variant={weeklyClients === option ? 'default' : 'outline'}
                      onClick={() => setWeeklyClients(option)}
                      className="w-full"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Services */}
              <div className="space-y-3">
                <label className="text-sm font-medium">¿Qué servicios ofreces?</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {SERVICES.map((service) => (
                    <div
                      key={service}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleServiceToggle(service)}
                    >
                      <Checkbox
                        checked={selectedServices.includes(service)}
                        onCheckedChange={() => handleServiceToggle(service)}
                      />
                      <span className="text-sm">{service}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => setCurrentStep('tour')} 
                className="w-full"
                size="lg"
              >
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 3: Tour */}
          {currentStep === 'tour' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {/* Indicador de paso */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {tourItems.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-6 rounded-full transition-all ${i === tourStep ? 'bg-primary' : i < tourStep ? 'bg-primary/40' : 'bg-muted'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{tourStep + 1} de {tourItems.length}</span>
              </div>

              {/* Función actual */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center ${tourItems[tourStep].color}`}>
                    {(() => { const Icon = tourItems[tourStep].icon; return <Icon className="h-5 w-5" />; })()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{tourItems[tourStep].title}</h2>
                    <p className="text-sm text-muted-foreground">{tourItems[tourStep].description}</p>
                  </div>
                </div>

                {/* Preview visual */}
                {tourItems[tourStep].preview}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('analysis')}
                  className="flex-1"
                >
                  Omitir
                </Button>
                <Button
                  onClick={() => {
                    if (tourStep < tourItems.length - 1) {
                      setTourStep(tourStep + 1);
                    } else {
                      setCurrentStep('analysis');
                    }
                  }}
                  className="flex-1"
                >
                  {tourStep < tourItems.length - 1 ? 'Siguiente →' : 'Entendido ✓'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: First Analysis */}
          {currentStep === 'analysis' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Probemos tu primer análisis</h2>
                <p className="text-sm text-muted-foreground">
                  Sube una foto de uña o usa una de ejemplo
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    navigate('/nail-analysis');
                    handleComplete();
                  }}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <span className="font-medium">Subir foto</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/nail-analysis?demo=true');
                    handleComplete();
                  }}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Image className="h-10 w-10 text-muted-foreground" />
                  <span className="font-medium">Usar ejemplo</span>
                </button>
              </div>

              <Button 
                variant="ghost"
                onClick={() => setCurrentStep('complete')} 
                className="w-full"
              >
                Saltar por ahora
              </Button>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">🎉 ¡Listo!</h1>
                <p className="text-muted-foreground">
                  Ya puedes usar NAIQO
                </p>
                <p className="text-sm text-muted-foreground">
                  Recuerda: tienes <span className="text-primary font-semibold">7 días gratis</span> para probar todo.
                </p>
              </div>
              <Button 
                onClick={handleComplete} 
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Guardando...' : 'Ir al Dashboard'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
