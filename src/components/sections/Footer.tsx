import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Instagram, Linkedin, Mail } from "lucide-react";
import naiqoLogo from "@/assets/naiqo-logo.png";

export const Footer = () => {
  return (
    <footer id="contact" className="bg-foreground text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Newsletter */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl p-8 mb-12 text-center">
          <h3 className="text-2xl font-bold mb-3">
            Recibe tips de IA para tu salón
          </h3>
          <p className="text-white/70 mb-6 max-w-md mx-auto">
            Novedades, consejos y ofertas exclusivas para hacer crecer tu negocio.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input 
              type="email"
              placeholder="tu@email.com" 
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
            <Button className="bg-white text-foreground hover:bg-white/90 shrink-0">
              Suscribirse
            </Button>
          </div>
        </div>

        {/* Main footer content */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img src={naiqoLogo} alt="NAIQO" className="w-10 h-10 rounded-xl" />
              <span className="text-2xl font-bold">NAIQO</span>
            </div>
            <p className="text-white/70 max-w-sm">
              El primer asistente IA para salones profesionales de uñas. 
              Diagnóstico, recomendaciones y gestión inteligente.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
                <Instagram className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
                <Linkedin className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
                <Mail className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Producto</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  Funcionalidades
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    window.location.href = '/subscribe';
                  }}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  Precios
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-white/70 hover:text-white transition-colors">
                  Términos de Servicio
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-white/70 hover:text-white transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-white/70 hover:text-white transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact info */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © 2025 NAIQO. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <span>📍 Albacete, España</span>
            <a href="mailto:hola@naiqo.es" className="hover:text-white transition-colors">
              hola@naiqo.es
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
