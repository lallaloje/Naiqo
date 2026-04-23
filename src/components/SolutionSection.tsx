import { useState } from "react";
import { Camera, Sparkles, MessageCircle, Heart, ArrowRight, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Camera,
    title: "Foto",
    description: "Captura una imagen",
    color: "from-primary to-primary/80",
  },
  {
    icon: Sparkles,
    title: "Análisis",
    description: "IA en 5 segundos",
    color: "from-secondary to-secondary/80",
  },
  {
    icon: MessageCircle,
    title: "Recomendación",
    description: "Tratamiento personalizado",
    color: "from-accent to-accent/80",
  },
  {
    icon: Heart,
    title: "Cliente feliz",
    description: "Confianza y fidelidad",
    color: "from-pink-500 to-pink-400",
  },
];

export const SolutionSection = () => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  return (
    <section id="demo-video" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Con NAIQO, en{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">30 segundos</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transforma tu flujo de trabajo con inteligencia artificial
          </p>
        </div>

        {/* Flow diagram */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0 mb-16 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className="text-center">
                <div className={`w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform`}>
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="font-bold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="hidden md:block w-8 h-8 text-muted-foreground/30 mx-4 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Video section */}
        <div className="max-w-3xl mx-auto">
          {isVideoPlaying ? (
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
              <button 
                onClick={() => setIsVideoPlaying(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
                title="Demo NAIQO"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div 
              className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 shadow-2xl cursor-pointer group"
              onClick={() => setIsVideoPlaying(true)}
            >
              {/* Preview image placeholder */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/90 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-primary ml-1" />
                  </div>
                  <p className="text-muted-foreground font-medium">Ver demo (45 seg)</p>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 rounded-full px-3 py-1.5 shadow">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium">Demo en vivo</span>
              </div>
            </div>
          )}
        </div>

        {/* CTA below video */}
        <div className="text-center mt-8">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <Sparkles className="w-4 h-4" />
            Probar demo interactiva
          </Button>
        </div>
      </div>
    </section>
  );
};
