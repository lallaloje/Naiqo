import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Sparkles } from "lucide-react";

const plans = [
  {
    id: 'basico',
    name: "Básico",
    price: "39",
    description: "Perfecto para empezar",
    icon: Zap,
    features: [
      "100 análisis/mes",
      "Asistente IA básico",
      "Recomendador de tratamientos",
      "Historial de análisis",
    ],
    highlighted: false,
  },
  {
    id: 'profesional',
    name: "Profesional",
    price: "79",
    description: "Ideal para salones en crecimiento",
    icon: Crown,
    badge: "Más Popular",
    features: [
      "500 análisis/mes",
      "Todo lo del plan Básico",
      "Gestión de citas avanzada",
      "Predicción de stock",
      "Reportes avanzados",
    ],
    highlighted: true,
  },
  {
    id: 'premium',
    name: "Premium",
    price: "149",
    description: "Para grandes cadenas",
    icon: Sparkles,
    features: [
      "Análisis ilimitados",
      "Todo lo del plan Profesional",
      "Soporte prioritario 24/7",
      "Formación personalizada 1-1",
      "Acceso API completo",
    ],
    highlighted: false,
  },
];

export const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">
            Precios Simples
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            Elige tu plan
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            7 días gratis • Sin tarjeta • Cancela cuando quieras
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col ${
                plan.highlighted 
                  ? "border-2 border-primary shadow-xl md:scale-105 z-10" 
                  : "border shadow-md"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />
              )}
              
              <CardHeader className="text-center pb-4">
                {plan.badge && (
                  <Badge className="w-fit mx-auto mb-2 bg-primary text-white">
                    {plan.badge}
                  </Badge>
                )}
                
                <div className={`w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 rounded-xl ${
                  plan.highlighted ? "bg-gradient-primary" : "bg-muted"
                } flex items-center justify-center`}>
                  <plan.icon className={`w-6 h-6 md:w-7 md:h-7 ${plan.highlighted ? "text-white" : "text-muted-foreground"}`} />
                </div>
                
                <CardTitle className="text-lg md:text-xl font-bold">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                
                <div className="mt-4">
                  <span className="text-3xl md:text-4xl font-bold">€{plan.price}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full mt-auto ${
                    plan.highlighted 
                      ? "bg-gradient-primary text-white hover:shadow-brand" 
                      : ""
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => navigate("/register")}
                >
                  Empezar gratis
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button 
            variant="link" 
            className="text-primary"
            onClick={() => navigate("/subscribe")}
          >
            Ver todos los detalles de planes →
          </Button>
        </div>
      </div>
    </section>
  );
};
