import { Sun, Focus, Palette, EyeOff, Zap, Check, X } from 'lucide-react';

export const PhotoTips = () => {
  const goodTips = [
    { icon: Sun, text: 'Buena iluminación natural' },
    { icon: Focus, text: 'Enfocar solo la uña' },
    { icon: Palette, text: 'Fondo neutro (blanco/gris)' },
  ];

  const badTips = [
    { icon: EyeOff, text: 'Evitar sombras' },
    { icon: Zap, text: 'No usar flash directo' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
      <div className="space-y-2">
        {goodTips.map((tip, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-3 w-3 text-green-600" />
            </div>
            <tip.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{tip.text}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {badTips.map((tip, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
              <X className="h-3 w-3 text-red-600" />
            </div>
            <tip.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{tip.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
