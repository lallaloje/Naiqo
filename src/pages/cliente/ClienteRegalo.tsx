import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Gift, ChevronLeft, Home, Calendar, User, Star } from 'lucide-react';

interface Salon {
  id: string;
  salon_name: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

const ClienteRegalo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clientUser, setClientUser] = useState<{ email: string; name: string } | null>(null);
  const [salones, setSalones] = useState<Salon[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=servicio, 2=estilo, 3=destinatario
  const [occasion, setOccasion] = useState('general');
  const [design, setDesign] = useState('classic');

  type Occasion = { id: string; label: string; emoji: string };
  type DesignOpt = { id: string; label: string; colors: string; emoji: string };

  const occasions: Occasion[] = [
    { id: 'general',     label: 'Sin ocasión',    emoji: '🎁' },
    { id: 'birthday',    label: 'Cumpleaños',      emoji: '🎂' },
    { id: 'christmas',   label: 'Navidad',         emoji: '🎄' },
    { id: 'valentine',   label: 'San Valentín',    emoji: '💝' },
    { id: 'anniversary', label: 'Aniversario',     emoji: '💍' },
  ];
  const designs: DesignOpt[] = [
    { id: 'classic',  label: 'Clásica elegante', colors: 'from-purple-600 to-pink-500',   emoji: '💜' },
    { id: 'romantic', label: 'Rosa romántica',   colors: 'from-pink-400 to-rose-400',     emoji: '🌸' },
    { id: 'minimal',  label: 'Minimalista',      colors: 'from-gray-800 to-gray-600',     emoji: '◼' },
    { id: 'golden',   label: 'Dorada premium',   colors: 'from-yellow-600 to-yellow-400', emoji: '✨' },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate('/cliente/login');
        return;
      }
      setClientUser({
        email: data.session.user.email || '',
        name: data.session.user.user_metadata?.display_name || data.session.user.email || '',
      });
    });

    supabase
      .from('salons')
      .select('id, salon_name')
      .in('subscription_status', ['active', 'trialing'])
      .order('salon_name')
      .then(({ data }) => setSalones(data || []));
  }, [navigate]);

  useEffect(() => {
    if (!selectedSalonId) { setServices([]); setSelectedServiceId(''); return; }
    supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('salon_id', selectedSalonId)
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setServices((data || []).filter(s => s.price && s.price > 0));
        setSelectedServiceId('');
      });
  }, [selectedSalonId]);

  const selectedService = services.find(s => s.id === selectedServiceId);

  const handlePay = async () => {
    if (!selectedService || !recipientName.trim() || !recipientEmail.trim()) {
      toast({ title: 'Completa todos los campos', variant: 'destructive' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(recipientEmail)) {
      toast({ title: 'El email del destinatario no es válido', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-gift-card-checkout', {
        body: {
          salonId: selectedSalonId,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          servicePrice: selectedService.price,
          buyerName: clientUser?.name || '',
          buyerEmail: clientUser?.email || '',
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim().toLowerCase(),
          message: message.trim(),
          occasion,
          design,
          origin: window.location.origin,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error('No se recibió la URL de pago');
    } catch (err) {
      toast({
        title: 'Error al procesar el pago',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => step === 3 ? setStep(2) : step === 2 ? setStep(1) : navigate('/cliente')} className="p-1 rounded-full hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-500" /> Tarjeta Regalo
        </h1>
      </div>

      <div className="px-4 pt-6 space-y-6">

        {step === 1 && (
          <>
            {/* Hero */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white text-center shadow-lg">
              <div className="text-4xl mb-2">🎁</div>
              <h2 className="text-xl font-bold mb-1">Regala una experiencia</h2>
              <p className="text-purple-100 text-sm">Elige el servicio perfecto para quien más quieres</p>
            </div>

            {/* Elegir salón */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Salón</label>
              <select
                value={selectedSalonId}
                onChange={e => setSelectedSalonId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                <option value="">Selecciona un salón</option>
                {salones.map(s => (
                  <option key={s.id} value={s.id}>{s.salon_name}</option>
                ))}
              </select>
            </div>

            {/* Elegir servicio */}
            {selectedSalonId && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Servicio</label>
                {services.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">Cargando servicios…</p>
                ) : (
                  <div className="space-y-2">
                    {services.map(svc => (
                      <button
                        key={svc.id}
                        onClick={() => setSelectedServiceId(svc.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                          selectedServiceId === svc.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-100 bg-white hover:border-purple-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{svc.name}</span>
                          <span className={`font-bold text-sm ${selectedServiceId === svc.id ? 'text-purple-600' : 'text-gray-700'}`}>
                            {svc.price}€
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{svc.duration_minutes} min</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedService && (
              <Button
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-3 font-semibold text-base"
              >
                Continuar — {selectedService.price}€
              </Button>
            )}
          </>
        )}

        {step === 2 && selectedService && (
          <>
            {/* Ocasión */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">¿Para qué ocasión es?</h3>
              <div className="grid grid-cols-3 gap-2">
                {occasions.map(occ => (
                  <button
                    key={occ.id}
                    onClick={() => setOccasion(occ.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      occasion === occ.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-100 bg-white hover:border-purple-200'
                    }`}
                  >
                    <span className="text-2xl">{occ.emoji}</span>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{occ.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Diseño */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">¿Qué diseño prefieres?</h3>
              <div className="grid grid-cols-2 gap-2">
                {designs.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDesign(d.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      design === d.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-100 bg-white hover:border-purple-200'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${d.colors} flex items-center justify-center text-white text-base flex-shrink-0`}>
                      {d.emoji}
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-left leading-tight">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep(3)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-3 font-semibold text-base"
            >
              Continuar
            </Button>
          </>
        )}

        {step === 3 && selectedService && (
          <>
            {/* Resumen */}
            <div className="bg-white rounded-2xl border border-purple-100 p-4 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Estás regalando</p>
              <p className="font-bold text-gray-800">{selectedService.name}</p>
              <p className="text-purple-600 font-bold text-lg">{selectedService.price}€</p>
            </div>

            {/* Datos destinatario */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">¿Para quién es?</h3>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre del destinatario *</label>
                <Input
                  placeholder="Nombre de quien lo recibe"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="rounded-xl border-gray-200 focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email del destinatario *</label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  className="rounded-xl border-gray-200 focus:border-purple-400"
                />
                <p className="text-xs text-gray-400 mt-1">Le enviaremos la tarjeta regalo a este email</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Mensaje personalizado (opcional)</label>
                <Textarea
                  placeholder="Escribe un mensaje especial para acompañar el regalo…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  className="rounded-xl border-gray-200 focus:border-purple-400 resize-none"
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/200</p>
              </div>
            </div>

            {/* Pagar */}
            <div className="bg-purple-50 rounded-2xl p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{selectedService.name}</span>
                <span className="font-semibold">{selectedService.price}€</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mb-3">
                <span>La tarjeta tiene validez de 1 año</span>
              </div>
              <Button
                onClick={handlePay}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-3 font-semibold text-base"
              >
                {loading ? 'Redirigiendo…' : `Pagar ${selectedService.price}€`}
              </Button>
              <p className="text-xs text-center text-gray-400 mt-2">🔒 Pago seguro con Stripe</p>
            </div>
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-around max-w-lg mx-auto">
        <button className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate('/cliente')}>
          <Home className="w-5 h-5" />
          <span className="text-xs">Inicio</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate('/cliente/mis-citas')}>
          <Calendar className="w-5 h-5" />
          <span className="text-xs">Mis citas</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate('/cliente/mis-sellos')}>
          <Star className="w-5 h-5" />
          <span className="text-xs">Mis sellos</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-primary">
          <Gift className="w-5 h-5" />
          <span className="text-xs font-medium text-center leading-tight">Tarjeta<br/>regalo</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate(clientUser ? '/cliente/mi-cuenta' : '/cliente/login')}>
          <User className="w-5 h-5" />
          <span className="text-xs">{clientUser ? 'Mi cuenta' : 'Acceder'}</span>
        </button>
      </div>
    </div>
  );
};

export default ClienteRegalo;
