import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

export const ContactSection = () => {
  return (
    <section id="contact" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            ¿Tienes alguna pregunta?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Estamos aquí para ayudarte. Contáctanos y te responderemos lo antes posible.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-foreground">
                Información de Contacto
              </h3>
            </div>

            <div className="space-y-6">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Email</h4>
                    <p className="text-muted-foreground">hola@naiqo.es</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Teléfono</h4>
                    <p className="text-muted-foreground">Próximamente</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Ubicación</h4>
                    <p className="text-muted-foreground">Albacete, España</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="bg-gradient-hero p-6 rounded-lg text-white">
              <div className="flex items-center space-x-3 mb-4">
                <MessageCircle className="w-6 h-6" />
                <h4 className="font-semibold">¿Necesitas una demo personalizada?</h4>
              </div>
              <p className="text-white/90 mb-4">
                Agenda una llamada con nuestro equipo y descubre cómo NAIQO puede transformar tu salón de uñas.
              </p>
              <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Agendar Demo
              </Button>
            </div>
          </div>

          {/* Contact Form */}
          <Card className="p-8">
            <h3 className="text-2xl font-semibold mb-6 text-foreground">
              Envíanos un mensaje
            </h3>
            
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre *
                  </label>
                  <Input placeholder="Tu nombre" className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email *
                  </label>
                  <Input type="email" placeholder="tu@email.com" className="w-full" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Asunto *
                </label>
                <Input placeholder="¿En qué podemos ayudarte?" className="w-full" />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Mensaje *
                </label>
                <Textarea 
                  placeholder="Cuéntanos más detalles sobre tu consulta..."
                  className="w-full min-h-[120px]"
                />
              </div>

              <Button className="w-full bg-gradient-primary text-white hover:shadow-brand">
                Enviar Mensaje
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Te responderemos en un plazo máximo de 24 horas.
              </p>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
};