import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Política de Privacidad de NAIQO</h1>
        <p className="text-muted-foreground mb-8">Última actualización: 21/9/2025</p>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-foreground mb-6">
            <strong>Responsable del tratamiento:</strong> NAIQO (Villarrobledo, Albacete, España)<br />
            <strong>Correo de contacto:</strong> hola@naiqo.es
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introducción</h2>
            <p className="text-muted-foreground leading-relaxed">
              En NAIQO (la "Aplicación") protegemos tu privacidad conforme al Reglamento General de Protección de Datos (RGPD) y la legislación española aplicable. Esta política explica qué datos recopilamos, para qué los usamos, con quién los compartimos y qué derechos te asisten.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Datos que Recopilamos</h2>
            <ul className="text-muted-foreground space-y-2">
              <li>• <strong>Datos de identificación:</strong> nombre, correo electrónico, teléfono (opcional) y datos de facturación.</li>
              <li>• <strong>Datos profesionales:</strong> información del salón, academia o profesional independiente (nombre comercial, dirección).</li>
              <li>• <strong>Datos de clientes finales</strong> (con consentimiento expreso): imágenes de uñas obtenidas con la cámara del dispositivo, historial de tratamientos, preferencias estéticas y de productos.</li>
              <li>• <strong>Datos de uso de la aplicación:</strong> estadísticas de acceso, funciones utilizadas, rendimiento de los algoritmos.</li>
              <li>• <strong>Datos de inventario y gestión:</strong> información sobre productos, consumo y predicciones de demanda.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Finalidad del Tratamiento</h2>
            <ul className="text-muted-foreground space-y-2">
              <li>• Prestar el servicio de diagnóstico inteligente y recomendaciones personalizadas.</li>
              <li>• Mejorar la precisión de los algoritmos de IA y la experiencia de usuario.</li>
              <li>• Gestionar citas, inventarios y predicciones de tendencias en los salones.</li>
              <li>• Ofrecer sugerencias de productos y servicios relevantes.</li>
              <li>• Garantizar el correcto funcionamiento, seguridad y mantenimiento de la aplicación.</li>
              <li>• Cumplir con obligaciones legales y fiscales.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Base Legal del Tratamiento</h2>
            <ul className="text-muted-foreground space-y-2">
              <li>• Consentimiento expreso (por ejemplo, para subir imágenes de uñas).</li>
              <li>• Ejecución de un contrato (prestación del servicio SaaS).</li>
              <li>• Interés legítimo en mejorar la aplicación, respetando los derechos de privacidad.</li>
              <li>• Cumplimiento de obligaciones legales (por ejemplo, facturación).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Conservación de los Datos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conservamos los datos personales mientras la cuenta permanezca activa. Las imágenes y datos asociados se eliminarán o anonimizarán a petición del usuario o tras un periodo máximo de 3 años, salvo obligación legal. Los datos de facturación se conservarán durante los plazos exigidos por la normativa fiscal aplicable.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Compartición de Datos</h2>
            <ul className="text-muted-foreground space-y-2">
              <li>• Profesionales sanitarios y asesores (p. ej., podólogos certificados) para la validación técnica de los modelos.</li>
              <li>• Proveedores tecnológicos (alojamiento cloud, sistemas de pago, analítica) bajo contratos de confidencialidad y seguridad.</li>
              <li>• Distribuidores y marcas únicamente cuando se gestionen compras a través de la tienda integrada.</li>
              <li>• Autoridades públicas cuando exista requerimiento legal.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Seguridad</h2>
            <p className="text-muted-foreground leading-relaxed">
              Aplicamos medidas técnicas y organizativas adecuadas: procesamiento híbrido local + nube cifrada, cifrado de comunicaciones (TLS), controles de acceso, registro de actividad y revisiones periódicas de seguridad.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Derechos de los Usuarios</h2>
            <ul className="text-muted-foreground space-y-2">
              <li>• Acceder a tus datos personales.</li>
              <li>• Rectificar datos inexactos o incompletos.</li>
              <li>• Solicitar la supresión (derecho al olvido).</li>
              <li>• Limitar u oponerte al tratamiento.</li>
              <li>• Solicitar la portabilidad.</li>
              <li>• Retirar el consentimiento en cualquier momento.</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Para ejercer estos derechos, escribe a <a href="mailto:hola@naiqo.es" className="text-primary hover:underline">hola@naiqo.es</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Transferencias Internacionales</h2>
            <p className="text-muted-foreground leading-relaxed">
              Si utilizamos proveedores situados fuera del Espacio Económico Europeo, garantizaremos un nivel adecuado de protección mediante Cláusulas Contractuales Tipo u otros mecanismos de adecuación reconocidos por la Comisión Europea.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Cambios en esta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podremos actualizar esta política para reflejar cambios operativos, legales o regulatorios. Te informaremos de las modificaciones significativas a través de la aplicación o por correo electrónico.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-muted-foreground text-center">
              © 2025 NAIQO — Todos los derechos reservados.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;