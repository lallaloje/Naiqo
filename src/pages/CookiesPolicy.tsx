import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const CookiesPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="max-w-none">
          <h1 className="text-4xl font-bold mb-8 text-center text-foreground">Política de Cookies – NAIQO</h1>
          
          <div className="bg-muted/50 rounded-lg p-6 mb-8">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Fecha de entrada en vigor:</strong> 21 de septiembre de 2025
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Contacto:</strong> hola@naiqo.es
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">1. ¿Qué son las cookies?</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web. Nos ayudan a proporcionar una mejor experiencia de usuario y a mejorar nuestros servicios.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Tipos de cookies que utilizamos</h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3 text-foreground">Cookies esenciales</h3>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                Estas cookies son necesarias para el funcionamiento básico del sitio web y no se pueden desactivar. Incluyen cookies de autenticación, seguridad y preferencias técnicas.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3 text-foreground">Cookies de rendimiento</h3>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                Nos ayudan a entender cómo los usuarios interactúan con nuestro sitio web, permitiéndonos mejorar la funcionalidad y el rendimiento. Estas cookies recopilan información anónima.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3 text-foreground">Cookies funcionales</h3>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                Permiten que el sitio web recuerde las elecciones que hace (como su idioma preferido) y proporcione características mejoradas y más personalizadas.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Cookies de terceros</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Utilizamos servicios de terceros que pueden establecer sus propias cookies para proporcionar funcionalidades como análisis de tráfico web y mejora de la experiencia del usuario.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Gestión de cookies</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Puede gestionar sus preferencias de cookies a través de la configuración de su navegador. Sin embargo, tenga en cuenta que deshabilitar ciertas cookies puede afectar la funcionalidad del sitio web.
            </p>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              La mayoría de los navegadores web permiten cierto control de las cookies a través de la configuración del navegador. Para obtener más información sobre las cookies, incluido cómo ver qué cookies se han establecido y cómo administrarlas y eliminarlas, visite www.allaboutcookies.org.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Consentimiento</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Al continuar utilizando nuestro sitio web, usted consiente el uso de cookies de acuerdo con esta política. Puede retirar su consentimiento en cualquier momento modificando la configuración de su navegador.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Cambios en esta política</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Podemos actualizar esta Política de Cookies periódicamente. Le recomendamos que revise esta página regularmente para mantenerse informado sobre cómo utilizamos las cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Contacto</h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Si tiene alguna pregunta sobre esta Política de Cookies, puede contactarnos en: <strong>hola@naiqo.es</strong>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiesPolicy;