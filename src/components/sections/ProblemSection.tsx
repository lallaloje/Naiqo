import { Card, CardContent } from "@/components/ui/card";
import { Clock, Eye, PackageX } from "lucide-react";

const problems = [
  {
    icon: Clock,
    stat: "60%",
    title: "del tiempo perdido",
    description: "en consultas repetitivas que podrían automatizarse",
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    icon: Eye,
    stat: "40%",
    title: "problemas no detectados",
    description: "de afecciones ungueales pasan desapercibidas a simple vista",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  {
    icon: PackageX,
    stat: "€180",
    title: "perdidos al mes",
    description: "en productos caducados o inventario mal gestionado",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
  },
];

export const ProblemSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            ¿Te suena familiar?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Los salones profesionales enfrentan estos problemas todos los días
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {problems.map((problem, index) => (
            <Card 
              key={index}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${problem.bgColor} flex items-center justify-center`}>
                  <problem.icon className={`w-8 h-8 ${problem.color}`} />
                </div>
                <div className={`text-4xl font-bold ${problem.color} mb-2`}>
                  {problem.stat}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {problem.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {problem.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
