import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength';
import { validatePassword } from '@/lib/passwordValidation';
import { supabase } from '@/integrations/supabase/client';
import naiqoLogo from '@/assets/naiqo-logo.png';
import { z } from 'zod';

const registerSchema = z.object({
  salonName: z.string().min(2, 'El nombre del salón debe tener al menos 2 caracteres'),
  email: z.string().email('Email no válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  contactName: z.string().min(2, 'El nombre de contacto debe tener al menos 2 caracteres'),
  phone: z.string().min(9, 'El teléfono debe tener al menos 9 dígitos'),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los términos y condiciones' }) }),
});

const Register = () => {
  const [formData, setFormData] = useState({
    salonName: '',
    email: '',
    password: '',
    contactName: '',
    phone: '',
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const passwordStrength = validatePassword(formData.password);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'password') {
      setShowPasswordStrength(typeof value === 'string' && value.length > 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: 'Error de validación',
        description: firstError.message,
        variant: 'destructive',
      });
      return;
    }

    if (!passwordStrength.isValid) {
      toast({
        title: 'Contraseña no válida',
        description: 'Por favor, mejora la seguridad de tu contraseña antes de continuar.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/gestion-citas`;
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            salon_name: formData.salonName,
            contact_name: formData.contactName,
            phone: formData.phone,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: 'Email ya registrado',
            description: 'Este email ya está registrado. Por favor, inicia sesión o usa otro email.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error al registrarse',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        // Send welcome email
        try {
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 7);
          
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'welcome',
              to: formData.email,
              data: {
                name: formData.contactName,
                trialEndDate: trialEndDate.toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                }),
                appUrl: window.location.origin,
              },
            },
          });
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
        }

        toast({
          title: '¡Registro exitoso!',
          description: 'Por favor, verifica tu email para completar el registro.',
        });
        navigate('/login');
      }
    } catch (error) {
      toast({
        title: 'Error inesperado',
        description: 'Ha ocurrido un error. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/10 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center mb-4">
            <img src={naiqoLogo} alt="NAIQO" className="w-12 h-12 rounded-xl mr-3" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              NAIQO
            </h1>
          </div>
          <CardTitle className="text-xl">Crea tu cuenta</CardTitle>
          <CardDescription>
            Registra tu salón y empieza tu prueba gratuita de 7 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salonName">Nombre del salón *</Label>
              <Input
                id="salonName"
                type="text"
                placeholder="Mi Salón de Uñas"
                value={formData.salonName}
                onChange={(e) => handleChange('salonName', e.target.value)}
                required
                className="border-input focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="border-input focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Crea una contraseña segura"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                className="border-input focus:border-primary"
              />
              {showPasswordStrength && (
                <PasswordStrengthIndicator strength={passwordStrength} />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Nombre de contacto *</Label>
              <Input
                id="contactName"
                type="text"
                placeholder="Tu nombre"
                value={formData.contactName}
                onChange={(e) => handleChange('contactName', e.target.value)}
                required
                className="border-input focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="612 345 678"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
                className="border-input focus:border-primary"
              />
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="acceptTerms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => handleChange('acceptTerms', checked === true)}
                className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="acceptTerms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                Acepto los{' '}
                <Link to="/terminos" className="text-primary hover:underline">
                  términos y condiciones
                </Link>{' '}
                y la{' '}
                <Link to="/privacidad" className="text-primary hover:underline">
                  política de privacidad
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-medium"
              disabled={loading || !formData.acceptTerms}
            >
              {loading ? 'Registrando...' : 'Crear cuenta gratis'}
            </Button>

            <p className="text-center text-sm text-muted-foreground pt-2">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Inicia sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
