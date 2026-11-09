import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, QrCode, CheckCircle, XCircle, Clock, Search, Camera } from 'lucide-react';

interface GiftCard {
  id: string;
  code: string;
  service_name: string;
  price_cents: number;
  buyer_name: string | null;
  buyer_email: string;
  recipient_name: string;
  recipient_email: string;
  message: string | null;
  status: 'active' | 'used' | 'expired';
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

interface Props {
  salonId: string;
}

const GiftCardsManager = ({ salonId }: Props) => {
  const { toast } = useToast();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedCard, setVerifiedCard] = useState<GiftCard | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'used'>('all');

  const loadCards = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('gift_cards')
      .select('*')
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false });
    setCards(data || []);
    setLoading(false);
  };

  useEffect(() => { loadCards(); }, [salonId]);

  const verifyCode = async (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setVerifying(true);
    setVerifyError('');
    setVerifiedCard(null);

    const { data } = await (supabase as any)
      .from('gift_cards')
      .select('*')
      .eq('code', c)
      .eq('salon_id', salonId)
      .maybeSingle();

    setVerifying(false);

    if (!data) { setVerifyError('Código no encontrado en este salón'); return; }

    if (data.status === 'used') { setVerifyError('Esta tarjeta ya fue canjeada'); setVerifiedCard(data); return; }
    if (data.status === 'expired' || new Date(data.expires_at) < new Date()) {
      setVerifyError('Esta tarjeta ha caducado'); setVerifiedCard(data); return;
    }

    setVerifiedCard(data);
  };

  const redeemCard = async () => {
    if (!verifiedCard || verifiedCard.status !== 'active') return;
    setVerifying(true);
    await (supabase as any)
      .from('gift_cards')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('id', verifiedCard.id);
    toast({ title: '✅ Tarjeta canjeada correctamente' });
    setVerifiedCard(prev => prev ? { ...prev, status: 'used' } : null);
    setVerifying(false);
    loadCards();
  };

  const filtered = cards.filter(c => {
    if (filter === 'active') return c.status === 'active';
    if (filter === 'used') return c.status === 'used';
    return true;
  });

  const statusBadge = (card: GiftCard) => {
    if (card.status === 'used') return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Canjeada</span>;
    if (card.status === 'expired' || new Date(card.expires_at) < new Date())
      return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Caducada</span>;
    return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Activa</span>;
  };

  return (
    <div className="space-y-5">
      {/* Verificar tarjeta */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
          <QrCode className="w-5 h-5 text-purple-500" /> Verificar / Canjear tarjeta
        </h3>

        <div className="flex gap-2">
          <Input
            placeholder="Introduce el código (ej. A3B2C8D1)"
            value={codeInput}
            onChange={e => { setCodeInput(e.target.value.toUpperCase()); setVerifyError(''); setVerifiedCard(null); }}
            onKeyDown={e => e.key === 'Enter' && verifyCode(codeInput)}
            className="rounded-xl border-purple-200 focus:border-purple-400 uppercase tracking-widest font-mono"
            maxLength={8}
          />
          <Button
            onClick={() => verifyCode(codeInput)}
            disabled={verifying || !codeInput.trim()}
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl px-4"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {verifyError && (
          <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3">
            <XCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{verifyError}</span>
            {verifiedCard && <span className="text-xs text-gray-500 ml-auto">Código: {verifiedCard.code}</span>}
          </div>
        )}

        {verifiedCard && verifiedCard.status === 'active' && !verifyError && (
          <div className="mt-3 bg-white rounded-xl border border-green-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Tarjeta válida
            </div>
            <div className="text-sm space-y-1 text-gray-700">
              <p><span className="text-gray-400">Para:</span> <strong>{verifiedCard.recipient_name}</strong></p>
              <p><span className="text-gray-400">Servicio:</span> {verifiedCard.service_name}</p>
              <p><span className="text-gray-400">Valor:</span> <strong>{(verifiedCard.price_cents / 100).toFixed(0)}€</strong></p>
              <p><span className="text-gray-400">Válida hasta:</span> {new Date(verifiedCard.expires_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {verifiedCard.message && <p className="italic text-gray-500">"{verifiedCard.message}"</p>}
            </div>
            <Button
              onClick={redeemCard}
              disabled={verifying}
              className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl"
            >
              {verifying ? 'Procesando…' : '✅ Marcar como canjeada'}
            </Button>
          </div>
        )}
      </div>

      {/* Lista */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-400" /> Todas las tarjetas
          </h3>
          <div className="flex gap-1">
            {(['all', 'active', 'used'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${filter === f ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-400 hover:text-gray-600'}`}>
                {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Canjeadas'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Cargando…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Gift className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay tarjetas regalo todavía</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(card => (
              <div key={card.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{card.recipient_name}</p>
                    <p className="text-xs text-gray-400">{card.recipient_email}</p>
                  </div>
                  {statusBadge(card)}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{card.service_name}</span>
                  <span className="font-bold text-purple-600">{(card.price_cents / 100).toFixed(0)}€</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-mono text-xs text-gray-400 tracking-widest">{card.code}</span>
                  <span className="text-xs text-gray-400">
                    {card.status === 'used' && card.used_at
                      ? `Canjeada el ${new Date(card.used_at).toLocaleDateString('es-ES')}`
                      : `Caduca el ${new Date(card.expires_at).toLocaleDateString('es-ES')}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GiftCardsManager;
