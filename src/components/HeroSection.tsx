import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Check, Sparkles } from "lucide-react";

export const HeroSection = () => {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-background via-primary/5 to-secondary/10 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, hsl(var(--secondary) / 0.1) 0%, transparent 50%)`
          }}
        />
      </div>

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left space-y-6">
            {/* Badge */}
            <Badge 
              variant="outline" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border-primary/20 text-primary"
            >
              <Sparkles className="w-4 h-4" />
              Primer asistente IA para salones de uñas
            </Badge>

            {/* Main headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Tu Nueva Mano{" "}
              <span className="inline-block">
                Derecha 💅🤖
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-xl">
              El primer asistente IA para salones profesionales de uñas. 
              Diagnóstico, recomendaciones y gestión en segundos.
            </p>

            {/* Key benefits */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-foreground">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span>Diagnóstico en 5 segundos</span>
              </div>
              <div className="flex items-center gap-3 text-foreground">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span>Recomendaciones personalizadas</span>
              </div>
              <div className="flex items-center gap-3 text-foreground">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span>7 días gratis, sin tarjeta</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                className="bg-gradient-primary text-white hover:shadow-brand text-lg px-8 py-6"
                onClick={() => navigate("/register")}
              >
                Empezar prueba gratuita
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 group"
                onClick={() => {
                  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Probar demo gratis
              </Button>
            </div>

            {/* Trust indicator */}
            <p className="text-sm text-muted-foreground pt-2">
              ✨ Únete a 50+ salones que ya confían en NAIQO
            </p>
          </div>

          {/* Right content - Video */}
          <div className="relative lg:pl-12 flex justify-center">
            <div className="relative mx-auto max-w-xs w-full">
              <div className="relative aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl">
                {/* Placeholder con botón play */}
                {!playing && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer bg-gradient-to-br from-primary/20 to-secondary/20"
                    onClick={() => { setPlaying(true); setTimeout(() => videoRef.current?.play(), 50); }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30" />
                    <div className="relative text-center">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-primary ml-1" />
                      </div>
                      <p className="text-white font-medium drop-shadow">Ver demo</p>
                    </div>
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 rounded-full px-3 py-1.5 shadow">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-medium">Demo en vivo</span>
                    </div>
                  </div>
                )}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover bg-black"
                  controls={playing}
                  playsInline
                  preload="metadata"
                >
                  <source src="https://tpwdbapkfmewxtatoytr.supabase.co/storage/v1/object/public/assets/demo-naiqo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
