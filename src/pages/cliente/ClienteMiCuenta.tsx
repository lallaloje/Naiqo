import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, User, Phone, Mail, CreditCard, Calendar, LogOut, Save, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ClienteMiCuenta = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [savedCard, setSavedCard] = useState<{
    card_brand: string | null;
    card_last4: string | null;
    card_exp_month: number | null;
    card_exp_year: number | null;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/cliente/login', { replace: true }); return; }

      const user = session.user;
      setEmail(user.email || '');
      setName(user.user_metadata?.display_name || '');

      // Cargar teléfono desde client_profiles
      const { data: profile } = await (supabase as any)
        .from('client_profiles')
        .select('phone, display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setPhone(profile.phone || '');
        if (profile.display_name) setName(profile.display_name);
      }

      // Cargar tarjeta guardada
      const { data: card } = await (supabase as any)
        .from('client_payment_methods')
        .select('card_brand, card_last4, card_exp_month, card_exp_year')
        .eq('client_email', user.email)
        .maybeSingle();

      if (card) setSavedCard(card);

      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Actualizar display_name en auth
      await supabase.auth.updateUser({ data: { display_name: name.trim() } });

      // Actualizar client_profiles
      await (supabase as any).from('client_profiles').upsert({
        user_id: session.user.id,
        phone: phone.trim() || null,
        display_name: name.trim() || null,
      }, { onConflict: 'user_id' });

      toast({ title: 'Guardado', description: 'Tus datos han sido actualizados.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/cliente', { replace: true });
  };

  const cardBrandIcon: Record<string, string> = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/cliente')} className="text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Mi cuenta</h1>
        </div>
        <p className="text-pink-100 text-sm ml-8">{email}</p>
      </div>

      <div className="px-4 py-6 max-w-sm mx-auto space-y-5">

        {/* Datos personales */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 text-pink-500" />
              Datos personales
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Teléfono
              </label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="612 345 678"
                type="tel"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <Input value={email} disabled className="bg-gray-50 text-gray-400" />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </CardContent>
        </Card>

        {/* Tarjeta guardada */}
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-purple-500" />
              Método de pago
            </p>
            {savedCard ? (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-2xl">{cardBrandIcon[savedCard.card_brand?.toLowerCase() || ''] || '💳'}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800 capitalize">
                    {savedCard.card_brand} •••• {savedCard.card_last4}
                  </p>
                  <p className="text-xs text-gray-400">
                    Caduca {savedCard.card_exp_month}/{savedCard.card_exp_year}
                  </p>
                </div>
                <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">
                Ninguna tarjeta guardada todavía.<br />
                <span className="text-xs">Se guardará al hacer tu primera reserva con pago.</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mis citas (acceso rápido) */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/cliente/mis-citas')}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-semibold text-gray-700">Mis citas</span>
            </div>
            <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180" />
          </CardContent>
        </Card>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-600 py-3 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default ClienteMiCuenta;
