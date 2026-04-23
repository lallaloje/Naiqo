import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, Brain, Sparkles, AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AnalysisStage = 'idle' | 'compressing' | 'uploading' | 'analyzing' | 'preparing' | 'complete' | 'error' | 'timeout' | 'offline';

interface AnalysisProgressProps {
  stage: AnalysisStage;
  uploadProgress?: number;
  startTime?: number;
  onRetry?: () => void;
  errorMessage?: string;
}

const STAGE_CONFIG = {
  idle: { label: '', icon: null, color: '' },
  compressing: { label: 'Comprimiendo imagen...', icon: Upload, color: 'text-blue-500' },
  uploading: { label: 'Subiendo foto...', icon: Upload, color: 'text-blue-500' },
  analyzing: { label: 'Analizando con IA...', icon: Brain, color: 'text-purple-500' },
  preparing: { label: 'Preparando resultados...', icon: Sparkles, color: 'text-green-500' },
  complete: { label: '¡Análisis completado!', icon: Sparkles, color: 'text-green-500' },
  error: { label: 'Algo salió mal', icon: AlertTriangle, color: 'text-destructive' },
  timeout: { label: 'Esto está tardando más de lo normal...', icon: AlertTriangle, color: 'text-yellow-500' },
  offline: { label: 'Sin conexión a internet', icon: WifiOff, color: 'text-muted-foreground' },
};

export const AnalysisProgress = ({ 
  stage, 
  uploadProgress = 0,
  startTime,
  onRetry,
  errorMessage
}: AnalysisProgressProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const config = STAGE_CONFIG[stage];
  const Icon = config.icon;

  useEffect(() => {
    if (!startTime || stage === 'idle' || stage === 'complete') {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, stage]);

  if (stage === 'idle') return null;

  const getProgressValue = () => {
    switch (stage) {
      case 'compressing': return 10;
      case 'uploading': return 10 + (uploadProgress * 0.3);
      case 'analyzing': return 40 + Math.min(elapsedTime * 5, 40);
      case 'preparing': return 85;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const isError = stage === 'error' || stage === 'timeout';
  const isOffline = stage === 'offline';
  const isActive = !isError && !isOffline && stage !== 'complete';

  return (
    <div className={cn(
      "p-4 rounded-lg border space-y-3",
      isError && "border-destructive/50 bg-destructive/5",
      isOffline && "border-muted bg-muted/50",
      !isError && !isOffline && "border-primary/20 bg-primary/5"
    )}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn("p-2 rounded-full", isActive && "animate-pulse", config.color)}>
            {isActive ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>
        )}
        <div className="flex-1">
          <p className={cn("font-medium", config.color)}>{config.label}</p>
          {isActive && (
            <p className="text-xs text-muted-foreground">
              Tiempo estimado: ~5 segundos
            </p>
          )}
          {errorMessage && (
            <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
          )}
        </div>
        {elapsedTime > 0 && isActive && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {elapsedTime}s
          </span>
        )}
      </div>

      {isActive && (
        <Progress value={getProgressValue()} className="h-2" />
      )}

      {isError && onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de nuevo
        </Button>
      )}

      {isOffline && (
        <p className="text-sm text-muted-foreground">
          La foto se guardará localmente y se analizará cuando tengas internet.
        </p>
      )}
    </div>
  );
};
