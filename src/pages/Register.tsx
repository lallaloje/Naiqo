import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
import { Ticket, Lock, CreditCard } from 'lucide-react';

const registerSchema = z.object({
  salonName:    z.string().min(2, 'El nombre del salón debe tener al menos 2 caracteres'),
  email:        z.string().email('Email no válido'),
  password:     z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  contactName:  z.string().min(2, 'El nombre de contacto debe tener al menos 2 caracteres'),
  phone:        z.string().min(9, 'El teléfono debe tener al menos 9 dígitos'),
  acceptTerms:  z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los términos y condiciones' }) }),
});

const Register = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { toast } = useToast();

  // If the user arrived from /planes → they want to subscribe (no beta code needed)
  const redirectTo: string | undefined = (location.state as { redirectTo?: string })?.redirectTo;
  const isSubscriptionFlow = Boolean(redirectTo?.includes('/checkout'));

  const [formData, setFormData] = useState({
    salonName: '',
    email: '',
    password: '',
    contactName: '',
    phone: '',
    acceptTerms: false,
  });
  const [betaCode,   setBetaCode]   = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [loading,    setLoading]    = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  const passwordStrength = validatePassword(formData.password);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'password') {
      setShowPasswordStrength(typeof value === 'string' && value.length > 0);
    }
  };

  const handleBetaCodeChange = (value: string) => {
    setBetaCode(value.toUpperCase());
    setCodeStatus('idle');
  };

  const validateBetaCode = async () => {
    if (!betaCode.trim()) return;
    setCodeStatus('checking');
    const { data, error } = await supabase
      .from('beta_codes')
      .select('code, used')
      .eq('code', betaCode.trim())
      .maybeSingle();
    setCodeStatus(error || !data || data.used ? 'invalid' : 'valid');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      toast({ title: 'Error de validación', description: result.error.errors[0].message, variant: 'destructive' });
      return;
    }
    if (!passwordStrength.isValid) {
      toast({ title: 'Contraseña no válida', description: 'Mejora la seguridad de tu contraseña antes de continuar.', variant: 'destructive' });
      return;
    }

    // Beta flow: code is required
    if (!isSubscriptionFlow) {
      if (!betaCode.trim()) {
        toast({ title: 'Código de acceso requerido', description: 'Naiqo está en beta cerrada. Necesitas un código de invitación.', variant: 'destructive' });
        return;
      }
      const { data: codeData, error: codeError } = await supabase
        .from('beta_codes')
        .select('code, used')
        .eq('code', betaCode.trim())
        .maybeSingle();
      if (codeError || !codeData || codeData.used) {
        setCodeStatus('invalid');
        toast({ title: 'Código no válido', description: !codeData ? 'Este código no existe.' : 'Este código ya fue utilizado.', variant: 'destructive' });
        return;
      }
      setCodeStatus('valid');
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email:    formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/gestion-citas`,
          data: {
            salon_name:   formData.salonName,
            contact_name: formData.contactName,
            phone:        formData.phone,
            // Only pass beta_code when in beta flow — trigger uses it to activate 90-day access
            ...(isSubscriptionFlow ? {} : { beta_code: betaCode.trim() }),
          },
        },
      });

      if (error) {
        toast({
          title: error.message.includes('already registered') ? 'Email ya registrado' : 'Error al registrarse',
          description: error.message.includes('already registered')
            ? 'Este email ya está registrado. Inicia sesión o usa otro email.'
            : error.message,
          variant: 'destructive',
        });
        return;
      }

      // Welcome email
      try {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (isSubscriptionFlow ? 7 : 90));
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'welcome',
            to:   formData.email,
            data: {
              name: formData.contactName,
              trialEndDate: endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
              appUrl: window.location.origin,
            },
          },
        });
      } catch (err) {
        console.error('Welcome email error:', err);
      }

      if (isSubscriptionFlow) {
        toast({ title: '¡Cuenta creada!', description: 'Verifica tu email y completa el pago para activar tu acceso.' });
        // Redirect to checkout so they can pay immediately
        navigate(redirectTo!);
      } else {
        toast({ title: '¡Bienvenida a la beta de Naiqo! 🎉', description: 'Revisa tu email para verificar tu cuenta y acceder.' });
        navigate('/login');
      }
    } catch {
      toast({ title: 'Error inesperado', description: 'Ha ocurrido un error. Inténtalo de nuevo.', variant: 'destructive' });
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

          {isSubscriptionFlow ? (
            <>
              <CardTitle className="text-xl">Crea tu cuenta</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Tras el registro completarás el pago para activar tu acceso
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-xl">Acceso Beta</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Programa beta cerrado — se necesita código de invitación
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {/* Banner contextual */}
          {isSubscriptionFlow ? (
            <div className="mb-5 rounded-xl bg-purple-50 border border-purple-200 p-3 flex gap-3 items-start">
              <CreditCard className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-700 leading-relaxed">
                Estás a un paso de activar Naiqo en tu salón. Crea tu cuenta y paga tu plan para tener acceso completo.
              </p>
            </div>
          ) : (
            <div className="mb-5 rounded-xl bg-indigo-50 border border-indigo-200 p-3 flex gap-3 items-start">
              <Ticket className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700 leading-relaxed">
                Naiqo está actualmente en <strong>beta privada</strong>. Si has recibido un código de acceso, introdúcelo abajo para crear tu cuenta.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Beta code — solo en flujo beta */}
            {!isSubscriptionFlow && (
              <div className="space-y-2">
                <Label htmlFor="betaCode">Código de acceso *</Label>
                <Input
                  id="betaCode"
                  type="text"
                  placeholder="NAIQO-BETA-XXXX"
                  value={betaCode}
                  onChange={e => handleBetaCodeChange(e.target.value)}
                  onBlur={validateBetaCode}
                  className={
                    codeStatus === 'valid'   ? 'border-green-500 focus:border-green-500' :
                    codeStatus === 'invalid' ? 'border-red-500 focus:border-red-500' :
                    'border-input focus:border-primary'
                  }
                />
                {codeStatus === 'checking' && <p className="text-xs text-muted-foreground">Verificando…</p>}
                {codeStatus === 'valid'    && <p className="text-xs text-green-600 font-medium">✓ Código válido</p>}
                {codeStatus === 'invalid'  && <p className="text-xs text-red-600 font-medium">✗ Código no válido o ya utilizado</p>}
              </div>
            )}

            <div className={`space-y-4 ${!isSubscriptionFlow ? 'border-t border-border/50 pt-4' : ''}`}>
              <div className="space-y-2">
                <Label htmlFor="salonName">Nombre del salón *</Label>
                <Input id="salonName" type="text" placeholder="Mi Salón de Uñas"
                  value={formData.salonName} onChange={e => handleChange('salonName', e.target.value)}
                  required className="border-input focus:border-primary" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="tu@email.com"
                  value={formData.email} onChange={e => handleChange('email', e.target.value)}
                  required className="border-input focus:border-primary" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <Input id="password" type="password" placeholder="Crea una contraseña segura"
                  value={formData.password} onChange={e => handleChange('password', e.target.value)}
                  required className="border-input focus:border-primary" />
                {showPasswordStrength && <PasswordStrengthIndicator strength={passwordStrength} />}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">Nombre de contacto *</Label>
                <Input id="contactName" type="text" placeholder="Tu nombre"
                  value={formData.contactName} onChange={e => handleChange('contactName', e.target.value)}
                  required className="border-input focus:border-primary" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input id="phone" type="tel" placeholder="612 345 678"
                  value={formData.phone} onChange={e => handleChange('phone', e.target.value)}
                  required className="border-input focus:border-primary" />
              </div>
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox id="acceptTerms" checked={formData.acceptTerms}
                onCheckedChange={checked => handleChange('acceptTerms', checked === true)}
                className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
              <Label htmlFor="acceptTerms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                Acepto los{' '}
                <Link to="/terminos" className="text-primary hover:underline">términos y condiciones</Link>
                {' '}y la{' '}
                <Link to="/privacidad" className="text-primary hover:underline">política de privacidad</Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-medium"
              disabled={
                loading ||
                !formData.acceptTerms ||
                codeStatus === 'invalid' ||
                codeStatus === 'checking'
              }
            >
              {loading
                ? 'Creando cuenta…'
                : isSubscriptionFlow
                  ? 'Crear cuenta y pagar'
                  : 'Acceder a la beta'}
            </Button>

            <p className="text-center text-sm text-muted-foreground pt-2">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">Inicia sesión</Link>
            </p>

            {/* Link to plans for non-beta visitors */}
            {!isSubscriptionFlow && (
              <p className="text-center text-xs text-muted-foreground">
                ¿No tienes código?{' '}
                <Link to="/planes" className="text-primary hover:underline">Ver planes de suscripción</Link>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
