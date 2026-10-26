import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, Gift } from 'lucide-react';

const STAMPS_FOR_REWARD = 10;

interface LoyaltyCard {
  stamps: number;
  stamps_used: number;
  client_name: string;
  salons: { salon_name: string } | null;
}

const ClienteSellos = () => {
  const [inputEmail, setInputEmail] = useState('');
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const salonId = searchParams.get('salon');

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    setLoading(true);
    const query = supabase
      .from('loyalty_cards')
      .select('stamps, stamps_used, client_name, salons(salon_name)')
      .ilike('client_email' as any, inputEmail.trim());
    if (salonId) (query as any).eq('salon_id', salonId);
    const { data } = await query;
    setCards((data as any) || []);
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/cliente')} className="text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Mis sellos</h1>
        </div>
        <p className="text-pink-100 text-sm ml-8">Acumula visitas y gana servicios gratis</p>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
        {/* Buscador por email */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <form onSubmit={buscar} className="space-y-3">
              <Label className="text-sm font-medium">Introduce tu email de reserva</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={inputEmail}
                  onChange={e => setInputEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0"
                  disabled={loading}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Resultados */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        )}

        {searched && !loading && cards.length === 0 && (
          <div className="text-center py-10">
            <Gift className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No encontramos tarjetas de fidelidad</p>
            <p className="text-gray-400 text-sm mt-1">para {inputEmail}</p>
            <p className="text-gray-400 text-xs mt-2">Los sellos se añaden automáticamente cuando completas una visita.</p>
          </div>
        )}

        {cards.map((card, i) => {
          const available = card.stamps - card.stamps_used * STAMPS_FOR_REWARD;
          const currentStamps = available % STAMPS_FOR_REWARD;
          const rewards = Math.floor(available / STAMPS_FOR_REWARD);

          return (
            <Card key={i} className="border-0 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 text-white">
                <p className="font-semibold">{(card.salons as any)?.salon_name || 'Salón'}</p>
                <p className="text-pink-100 text-xs mt-0.5">Tarjeta de fidelidad de {card.client_name}</p>
              </div>
              <CardContent className="p-4 space-y-4">
                {/* Grid de sellos */}
                <div>
                  <p className="text-xs text-gray-500 mb-3">
                    {currentStamps} de {STAMPS_FOR_REWARD} visitas · {STAMPS_FOR_REWARD - currentStamps} más para tu próximo regalo
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: STAMPS_FOR_REWARD }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`aspect-square rounded-xl flex items-center justify-center text-lg transition-all ${
                          idx < currentStamps
                            ? 'bg-gradient-to-br from-pink-400 to-purple-500 shadow-sm'
                            : 'bg-gray-100'
                        }`}
                      >
                        {idx < currentStamps ? '💅' : <span className="w-3 h-3 rounded-full bg-gray-300 block mx-auto" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progreso */}
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-pink-400 to-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${(currentStamps / STAMPS_FOR_REWARD) * 100}%` }}
                  />
                </div>

                {/* Recompensas disponibles */}
                {rewards > 0 && (
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-3 flex items-center gap-3">
                    <Gift className="w-5 h-5 text-purple-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        🎉 ¡Tienes {rewards} servicio{rewards > 1 ? 's' : ''} gratis!
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Díselo al salón en tu próxima visita</p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400 text-center">
                  Total de visitas: {card.stamps} · Canjeados: {card.stamps_used} regalo{card.stamps_used !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-around max-w-lg mx-auto">
        <button className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate('/cliente')}>
          <Search className="w-5 h-5" />
          <span className="text-xs">Explorar</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate('/cliente/mis-citas')}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-xs">Mis citas</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-primary">
          <Gift className="w-5 h-5" />
          <span className="text-xs font-medium">Mis sellos</span>
        </button>
      </div>

      <div className="h-20" />
    </div>
  );
};

export default ClienteSellos;
