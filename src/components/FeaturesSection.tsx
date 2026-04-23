import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, MessageSquare, Target, Calendar, BarChart3, Shield } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Análisis de Salud Ungueal",
    description: "Detecta hongos, fragilidad y manchas en 5 segundos con visión por IA.",
    badge: "IA Visión",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: MessageSquare,
    title: "Asistente Conversacional",
    description: "Responde preguntas y explica diagnósticos en lenguaje natural.",
    badge: "Chat IA",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Target,
    title: "Recomendaciones Personalizadas",
    description: "Sugiere tratamientos basados en el historial de cada clienta.",
    badge: "Smart",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Calendar,
    title: "Gestión de Citas",
    description: "Agenda inteligente con recordatorios automáticos por WhatsApp.",
    badge: "Automatizado",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: BarChart3,
    title: "Predicción de Demanda",
    description: "Anticipa necesidades de stock y evita productos caducados.",
    badge: "Predictivo",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Shield,
    title: "Privacidad GDPR",
    description: "Datos encriptados y procesamiento seguro. Cumplimiento total.",
    badge: "Seguro",
    gradient: "from-slate-500 to-gray-600",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">
            Funcionalidades
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Todo lo que necesitas en{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">una app</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Herramientas profesionales diseñadas para salones de uñas modernos
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-white overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className={`w-14 h-14 mb-4 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs bg-muted/80">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
