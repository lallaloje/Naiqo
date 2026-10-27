import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'register';

const ClienteLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [name, setName]         = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [sent, setSent]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'register') {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      });
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

      // Crear perfil con teléfono
      if (data.user) {
        await supabase.from('client_profiles' as any).upsert({
          user_id: data.user.id,
          phone: phone.trim() || null,
          display_name: name.trim() || null,
        });
      }

      // Si Supabase requiere confirmación de email, informar
      if (!data.session) {
        setSent(true);
        setLoading(false);
        return;
      }
      navigate('/cliente/mis-citas', { replace: true });
    } else {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setError('Email o contraseña incorrectos');
        setLoading(false);
        return;
      }
      navigate('/cliente/mis-citas', { replace: true });
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">💌</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Revisa tu email</h2>
        <p className="text-gray-500 text-sm mb-6">
          Te hemos enviado un enlace de confirmación a <strong>{email}</strong>.<br />
          Ábrelo y ya podrás iniciar sesión.
        </p>
        <Button variant="outline" onClick={() => setSent(false)}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/cliente')} className="text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h1>
        </div>
        <p className="text-pink-100 text-sm ml-8">
          {mode === 'login'
            ? 'Accede a tus citas y sellos'
            : 'Regístrate para gestionar tus reservas'}
        </p>
      </div>

      <div className="px-4 py-6 max-w-sm mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="María García"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="612 345 678"
                  type="tel"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Así vinculamos tus citas anteriores
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="maria@ejemplo.com"
              type="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                type={showPass ? 'text' : 'password'}
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white"
            disabled={loading}
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          {mode === 'login' ? (
            <p className="text-sm text-gray-500">
              ¿No tienes cuenta?{' '}
              <button
                className="text-pink-600 font-medium"
                onClick={() => { setMode('register'); setError(''); }}
              >
                Regístrate
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              ¿Ya tienes cuenta?{' '}
              <button
                className="text-pink-600 font-medium"
                onClick={() => { setMode('login'); setError(''); }}
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClienteLogin;
