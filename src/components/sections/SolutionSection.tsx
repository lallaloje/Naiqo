import { Camera, Sparkles, MessageCircle, Heart, ArrowRight } from "lucide-react";
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
        <div className="max-w-sm mx-auto">
          <div className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-black">
            <video
              className="w-full h-full object-cover"
              controls
              playsInline
              preload="metadata"
            >
              <source src="https://tpwdbapkfmewxtatoytr.supabase.co/storage/v1/object/public/assets/demo-naiqo.mp4" type="video/mp4" />
            </video>
          </div>
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
