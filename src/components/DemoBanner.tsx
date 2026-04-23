import { useState } from 'react';
import { useDemoMode } from '@/hooks/useDemoMode';
import { Button } from '@/components/ui/button';
import { Eye, RefreshCw, X } from 'lucide-react';

export const DemoBanner = () => {
  const { isDemoMode, deactivateDemo, resetDemo } = useDemoMode();
  const [showOptions, setShowOptions] = useState(false);

  if (!isDemoMode) return null;

  return (
    <div className="fixed top-4 right-4 z-[100]">
      <div 
        className="bg-amber-500/90 text-white px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm cursor-pointer flex items-center gap-2 text-sm font-medium"
        onClick={() => setShowOptions(!showOptions)}
      >
        <Eye className="h-4 w-4" />
        <span className="hidden sm:inline">Modo Demo</span>
        <span className="sm:hidden">🎭</span>
      </div>
      
      {showOptions && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-border p-3 min-w-[200px]">
          <p className="text-xs text-muted-foreground mb-3">
            Modo demostración activo. Los datos son ficticios.
          </p>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => {
                resetDemo();
                setShowOptions(false);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reiniciar demo
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => {
                deactivateDemo();
                setShowOptions(false);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Salir del modo demo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
