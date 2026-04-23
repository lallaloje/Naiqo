import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="max-w-none">
          <h1 className="text-4xl font-bold mb-8 text-center text-foreground">Términos de Servicio – NAIQO</h1>
          
          <div className="bg-muted/50 rounded-lg p-6 mb-8">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Fecha de entrada en vigor:</strong> 21 de septiembre de 2025
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Contacto:</strong> hola@naiqo.es
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Aceptación de los Términos</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Al registrarse, acceder o utilizar la plataforma NAIQO ("el Servicio"), el usuario acepta quedar vinculado por estos Términos de Servicio. Si no está de acuerdo, no debe usar el Servicio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Descripción del Servicio</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              NAIQO es una solución SaaS que combina: Diagnóstico inteligente de salud ungueal, recomendador de tratamientos y productos, y gestión predictiva de inventario y citas. NAIQO no sustituye el diagnóstico médico. Las recomendaciones tienen carácter informativo y estético.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Registro y Cuentas</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              El usuario debe proporcionar información veraz y mantener actualizados sus datos. La cuenta es personal e intransferible. El usuario es responsable de la confidencialidad de sus credenciales.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Uso Aceptable</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              El usuario se compromete a no usar el Servicio para fines ilícitos, no cargar imágenes ni datos sin consentimiento expreso de los clientes, y respetar los derechos de propiedad intelectual de NAIQO y de terceros.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Planes y Pagos</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Los planes disponibles son:
            </p>
            <ul className="list-disc pl-6 mb-4 text-muted-foreground">
              <li className="mb-2">Profesionales independientes: 49€/mes</li>
              <li className="mb-2">Salones: 89€/mes</li>
              <li className="mb-2">Academias: 149€/mes (multiusuario)</li>
            </ul>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Todos incluyen una prueba gratuita de 30 días. Los pagos se realizan de forma recurrente y pueden ser cancelados en cualquier momento con efecto en el siguiente ciclo.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Política de Cancelación</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              El usuario puede cancelar su suscripción en cualquier momento desde su cuenta. No se realizan devoluciones por periodos ya facturados.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Propiedad Intelectual</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              NAIQO conserva todos los derechos sobre la plataforma, algoritmos, base de datos y contenido. El usuario conserva los derechos sobre sus propios datos e imágenes, otorgando a NAIQO una licencia limitada para procesarlos con fines de prestación del servicio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Protección de Datos</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              NAIQO cumple con el Reglamento General de Protección de Datos (RGPD). Los datos se procesan de forma segura mediante cifrado y almacenamiento híbrido (local + nube). El usuario tiene derecho de acceso, rectificación y supresión.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Limitación de Responsabilidad</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              NAIQO no garantiza que los diagnósticos sean infalibles ni sustituye la consulta con un profesional médico. El uso del servicio es bajo la responsabilidad del usuario. En ningún caso NAIQO será responsable de daños indirectos, lucro cesante o pérdidas derivadas del uso de la plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">10. Modificaciones</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              NAIQO se reserva el derecho a modificar estos Términos. Las modificaciones se notificarán a los usuarios con antelación razonable.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">11. Legislación Aplicable y Jurisdicción</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Estos Términos se rigen por la legislación española. Cualquier disputa será resuelta en los tribunales de Albacete.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;