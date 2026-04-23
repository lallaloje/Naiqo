import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    question: "¿Necesito conocimientos técnicos?",
    answer: "No, NAIQO está diseñado para ser tan fácil como usar WhatsApp. Solo tienes que hacer fotos y seguir las recomendaciones. La IA hace todo el trabajo técnico por ti.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer: "Absolutamente. Cumplimos con GDPR al 100%. Todos los datos están encriptados y almacenados en servidores europeos. Nunca compartimos información con terceros.",
  },
  {
    question: "¿Puedo cancelar cuando quiera?",
    answer: "Sí, sin compromiso. Puedes cancelar tu suscripción en cualquier momento desde la app. No hay permanencia ni penalizaciones.",
  },
  {
    question: "¿Funciona offline?",
    answer: "Sí, puedes tomar fotos sin conexión. Se guardan localmente y se analizan automáticamente cuando vuelvas a tener internet.",
  },
  {
    question: "¿Qué precisión tiene el análisis?",
    answer: "Nuestra IA tiene una precisión del 94% en detección de problemas ungueales comunes. Siempre recomendamos confirmar diagnósticos complejos con un especialista.",
  },
  {
    question: "¿Incluye soporte técnico?",
    answer: "Sí, todos los planes incluyen soporte por email. Los planes Salón y superiores tienen soporte prioritario con respuesta en menos de 24 horas.",
  },
];

export const FAQSection = () => {
  return (
    <section id="faq" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">
            FAQ
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Preguntas frecuentes
          </h2>
          <p className="text-xl text-muted-foreground">
            Resolvemos tus dudas más comunes
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-white rounded-xl border-0 shadow-sm px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
