import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { startAuthentication } from '@simplewebauthn/browser';
import { Delete, Fingerprint } from 'lucide-react';
import naiqoLogo from '@/assets/naiqo-logo.png';

// ── PIN Numpad ──────────────────────────────────────────────────────────────
function PinNumpad({
  pin,
  onDigit,
  onDelete,
}: {
  pin: string;
  onDigit: (d: string) => void;
  onDelete: () => void;
}) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <div className="space-y-3">
      {/* Dots */}
      <div className="flex justify-center gap-3 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
              i < pin.length ? 'bg-primary border-primary scale-110' : 'border-muted-foreground/40'
            }`}
          />
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k, i) =>
          k === '' ? (
            <div key={i} />
          ) : k === '⌫' ? (
            <button
              key={i}
              type="button"
              onClick={onDelete}
              className="h-14 rounded-xl bg-muted hover:bg-muted/70 flex items-center justify-center transition-all active:scale-95"
            >
              <Delete className="w-5 h-5 text-muted-foreground" />
            </button>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => onDigit(k)}
              disabled={pin.length >= 6}
              className="h-14 rounded-xl bg-muted hover:bg-primary/10 text-xl font-semibold transition-all active:scale-95 disabled:opacity-40"
            >
              {k}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
const Login = () => {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [mode, setMode]             = useState<'password' | 'pin' | 'biometric'>('password');
  const [pin, setPin]               = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);

  const { signIn, user } = useAuth();
  const { toast }        = useToast();
  const navigate         = useNavigate();
  const isMobile         = useIsMobile();

  useEffect(() => {
    if (user) navigate('/gestion-citas');
  }, [user, navigate]);

  // ── Password login ────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Campos requeridos', description: 'Introduce tu email y contraseña.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      let msg = error.message;
      if (msg.includes('Invalid login credentials')) msg = 'Email o contraseña incorrectos';
      else if (msg.includes('Email not confirmed')) msg = 'Confirma tu email antes de iniciar sesión';
      toast({ title: 'Error al iniciar sesión', description: msg, variant: 'destructive' });
    }
    setLoading(false);
  };

  // ── PIN login ─────────────────────────────────────────────────────────────
  const handlePinDigit = (d: string) => {
    if (pin.length < 6) {
      const next = pin + d;
      setPin(next);
      if (next.length === 6) submitPin(next);
    }
  };
  const handlePinDelete = () => setPin((p) => p.slice(0, -1));

  const submitPin = async (pinValue: string) => {
    if (!email) {
      toast({ title: 'Email requerido', description: 'Introduce tu email primero.', variant: 'destructive' });
      setPin('');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-pin-login', {
        body: { email, pin: pinValue },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      toast({ title: '¡Bienvenido!', description: 'Sesión iniciada con PIN.' });
    } catch (err: any) {
      toast({ title: 'PIN incorrecto', description: err.message || 'Inténtalo de nuevo.', variant: 'destructive' });
      setPin('');
    }
    setLoading(false);
  };

  // ── Biometric login ───────────────────────────────────────────────────────
  const handleBiometric = async () => {
    if (!email) {
      toast({ title: 'Email requerido', description: 'Introduce tu email primero.', variant: 'destructive' });
      return;
    }
    setBiometricLoading(true);
    try {
      // 1. Get challenge
      const { data: startData, error: startError } = await supabase.functions.invoke('auth-webauthn-login-start', {
        body: { email },
      });
      if (startError || startData?.error) throw new Error(startData?.error || startError?.message);

      // 2. Trigger Face ID / fingerprint
      const assertion = await startAuthentication({ optionsJSON: startData.options });

      // 3. Verify with server
      const { data: finishData, error: finishError } = await supabase.functions.invoke('auth-webauthn-login-finish', {
        body: { assertion, challenge_id: startData.challenge_id, email },
      });
      if (finishError || finishData?.error) throw new Error(finishData?.error || finishError?.message);

      // 4. Create session
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: finishData.token_hash,
        type: 'email',
      });
      if (verifyError) throw verifyError;

      toast({ title: '¡Bienvenido!', description: 'Sesión iniciada con reconocimiento biométrico.' });
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast({ title: 'Cancelado', description: 'La verificación biométrica fue cancelada.', variant: 'destructive' });
      } else {
        toast({ title: 'Error biométrico', description: err.message || 'Inténtalo de nuevo.', variant: 'destructive' });
      }
    }
    setBiometricLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
          <CardTitle className="text-xl">Inicia sesión</CardTitle>
          <CardDescription>Accede a tu panel de gestión de salón</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email — always visible */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-input focus:border-primary"
            />
          </div>

          {/* ── Password mode ── */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-input focus:border-primary"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-medium"
                disabled={loading}
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </form>
          )}

          {/* ── PIN mode ── */}
          {mode === 'pin' && (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">Introduce tu PIN de 6 dígitos</p>
              <PinNumpad pin={pin} onDigit={handlePinDigit} onDelete={handlePinDelete} />
              {loading && (
                <p className="text-center text-sm text-muted-foreground animate-pulse">Verificando…</p>
              )}
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => { setMode('password'); setPin(''); }}
              >
                Usar contraseña
              </Button>
            </div>
          )}

          {/* ── Separator + Quick Access buttons ── */}
          {mode === 'password' && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">o acceso rápido</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Desktop: PIN */}
              {!isMobile && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => { setMode('pin'); setPin(''); }}
                >
                  <span className="text-lg">🔢</span>
                  Entrar con PIN
                </Button>
              )}

              {/* Mobile: Face ID / Fingerprint */}
              {isMobile && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={handleBiometric}
                  disabled={biometricLoading}
                >
                  <Fingerprint className="w-5 h-5" />
                  {biometricLoading ? 'Verificando…' : 'Entrar con Face ID / Huella'}
                </Button>
              )}
            </>
          )}

          <p className="text-center text-sm text-muted-foreground pt-1">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Regístrate gratis
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
