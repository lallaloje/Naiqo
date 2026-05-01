import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Scissors, MapPin, ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Cita {
  id: string;
  client_name: string;
  client_email: string | null;
  start_time: string;
  end_time: string;
  status: string;
  salons: { salon_name: string } | null;
  services: { name: string; price: number | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending:   '⏳ Pendiente',
  scheduled: 'Programada',
  confirmed: '✅ Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};
const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-orange-100 text-orange-700 border-orange-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200',
};

const ClienteMisCitas = () => {
  const [email, setEmail] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const buscarCitas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*, salons(salon_name), services(name, price)')
      .eq('client_email', inputEmail.trim().toLowerCase())
      .order('start_time', { ascending: false });
    setCitas((data as any) || []);
    setEmail(inputEmail.trim().toLowerCase());
    setLoading(false);
  };

  const proximas = citas.filter(c =>
    new Date(c.start_time) >= new Date() && c.status !== 'cancelled'
  );
  const pasadas = citas.filter(c =>
    new Date(c.start_time) < new Date() || c.status === 'cancelled'
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/cliente')} className="text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Mis citas</h1>
        </div>
        <p className="text-pink-100 text-sm ml-8">Consulta tus reservas</p>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-5">

        {/* Email form */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <form onSubmit={buscarCitas} className="space-y-3">
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

        {/* Results */}
        {email && !loading && (
          <>
            {citas.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No encontramos citas</p>
                <p className="text-gray-400 text-sm mt-1">para {email}</p>
              </div>
            ) : (
              <>
                {/* Upcoming */}
                {proximas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Próximas · {proximas.length}
                    </p>
                    <div className="space-y-3">
                      {proximas.map(cita => <CitaCard key={cita.id} cita={cita} onReservar={() => navigate(`/reservar/${(cita.salons as any)?.id || ''}`)} />)}
                    </div>
                  </div>
                )}

                {/* Past */}
                {pasadas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">
                      Historial · {pasadas.length}
                    </p>
                    <div className="space-y-3 opacity-70">
                      {pasadas.map(cita => <CitaCard key={cita.id} cita={cita} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* CTA to find salons */}
        <Card className="border-dashed border-pink-200 bg-pink-50/50 border-0 shadow-none">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-sm text-gray-600 mb-3">¿Quieres pedir una nueva cita?</p>
            <Button
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0"
              onClick={() => navigate('/cliente')}
            >
              <Search className="w-4 h-4 mr-2" />
              Buscar salones
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-around max-w-lg mx-auto">
        <button
          className="flex flex-col items-center gap-1 text-gray-400"
          onClick={() => navigate('/cliente')}
        >
          <Search className="w-5 h-5" />
          <span className="text-xs">Explorar</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-primary">
          <Calendar className="w-5 h-5" />
          <span className="text-xs font-medium">Mis citas</span>
        </button>
      </div>

      <div className="h-20" />
    </div>
  );
};

const CitaCard = ({ cita, onReservar }: { cita: Cita; onReservar?: () => void }) => {
  const dt = new Date(cita.start_time);
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={`text-xs border ${STATUS_COLOR[cita.status] || STATUS_COLOR.scheduled}`}>
                {STATUS_LABEL[cita.status] || cita.status}
              </Badge>
            </div>
            <p className="font-semibold text-gray-900">
              {(cita.salons as any)?.salon_name || 'Salón'}
            </p>
            {cita.services && (
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                {(cita.services as any).name}
                {(cita.services as any).price ? ` · €${(cita.services as any).price}` : ''}
              </p>
            )}
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {onReservar && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs h-8 border-pink-200 text-pink-600"
              onClick={onReservar}
            >
              Repetir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClienteMisCitas;
