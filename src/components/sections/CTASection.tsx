import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-hero text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Únete a 50+ salones que ya usan NAIQO</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Empieza hoy tu transformación digital
          </h2>

          <p className="text-xl text-white/90 mb-8 max-w-xl mx-auto">
            7 días gratis para probar todas las funcionalidades. 
            Sin tarjeta de crédito. Sin compromiso.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 shadow-xl"
              onClick={() => navigate("/register")}
            >
              Empezar 7 días gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6"
              onClick={() => {
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Contactar con ventas
            </Button>
          </div>

          <p className="text-white/60 text-sm mt-6">
            ✓ Sin tarjeta de crédito &nbsp;•&nbsp; ✓ Cancela cuando quieras &nbsp;•&nbsp; ✓ Soporte incluido
          </p>
        </div>
      </div>
    </section>
  );
};
