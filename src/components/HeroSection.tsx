import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Check, Sparkles } from "lucide-react";
import naiqoLogo from "@/assets/naiqo-logo.png";

export const HeroSection = () => {
  const navigate = useNavigate();

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
                  document.getElementById("demo-video")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Ver demo en video
              </Button>
            </div>

            {/* Trust indicator */}
            <p className="text-sm text-muted-foreground pt-2">
              ✨ Únete a 50+ salones que ya confían en NAIQO
            </p>
          </div>

          {/* Right content - Mockup */}
          <div className="relative lg:pl-12">
            <div className="relative mx-auto max-w-sm">
              {/* Phone mockup frame */}
              <div className="relative bg-foreground rounded-[3rem] p-3 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-foreground rounded-b-2xl z-10" />
                <div className="bg-background rounded-[2.5rem] overflow-hidden aspect-[9/19]">
                  {/* App preview content */}
                  <div className="p-4 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <img src={naiqoLogo} alt="NAIQO" className="w-8 h-8 rounded-lg" />
                      <span className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">NAIQO</span>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4">
                        <p className="text-sm font-medium text-foreground">¡Bienvenida! 👋</p>
                        <p className="text-xs text-muted-foreground mt-1">Escanea una uña para comenzar</p>
                      </div>
                      
                      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            📸
                          </div>
                          <div>
                            <p className="text-xs font-medium">Análisis IA</p>
                            <p className="text-[10px] text-muted-foreground">5 seg</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-green-800">Uñas saludables</span>
                        </div>
                        <p className="text-[10px] text-green-600 mt-1">Confianza: 94%</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Recomendaciones:</p>
                        <div className="text-[10px] text-muted-foreground space-y-1">
                          <p>✓ Aceite de cutícula diario</p>
                          <p>✓ Hidratación regular</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -left-4 top-1/4 bg-white rounded-xl shadow-lg p-3 animate-bounce" style={{ animationDuration: "3s" }}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="text-xs font-bold">5 seg</p>
                    <p className="text-[10px] text-muted-foreground">Análisis</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 top-1/2 bg-white rounded-xl shadow-lg p-3 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-xs font-bold">94%</p>
                    <p className="text-[10px] text-muted-foreground">Precisión</p>
                  </div>
                </div>
              </div>

              <div className="absolute -left-8 bottom-1/4 bg-white rounded-xl shadow-lg p-3 animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💅</span>
                  <div>
                    <p className="text-xs font-bold">50+</p>
                    <p className="text-[10px] text-muted-foreground">Salones</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
