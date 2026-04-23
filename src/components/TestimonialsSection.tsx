import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Desde que uso NAIQO, mis clientas confían más en mí. El diagnóstico visual es impresionante.",
    author: "María G.",
    role: "Salón Bella Nails",
    location: "Albacete",
    rating: 5,
    avatar: "👩‍💼",
  },
  {
    quote: "Ahorro 2 horas al día en consultas repetitivas. La IA responde mejor que yo a veces.",
    author: "Carmen R.",
    role: "Estética Carmen",
    location: "Valencia",
    rating: 5,
    avatar: "👩‍🦰",
  },
  {
    quote: "El predictor de demanda me ha evitado €200 en productos caducados este mes.",
    author: "Laura M.",
    role: "Nails by Laura",
    location: "Madrid",
    rating: 5,
    avatar: "👩‍🔬",
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Lo que dicen nuestros{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">clientes</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Salones reales con resultados reales
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-primary/10">
                <Quote className="w-12 h-12" />
              </div>
              <CardContent className="p-6">
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-foreground mb-6 leading-relaxed relative z-10">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.location}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
