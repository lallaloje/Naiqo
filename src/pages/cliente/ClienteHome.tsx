import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, Star, Calendar, ChevronRight, Scissors } from 'lucide-react';

interface Salon {
  id: string;
  salon_name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  description: string | null;
}

const ClienteHome = () => {
  const [salones, setSalones] = useState<Salon[]>([]);
  const [filtered, setFiltered] = useState<Salon[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSalones = async () => {
      const { data } = await supabase
        .from('salons')
        .select('id, salon_name, city, address, phone, description')
        .order('salon_name');
      setSalones(data || []);
      setFiltered(data || []);
      setLoading(false);
    };
    loadSalones();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(salones);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        salones.filter(
          s =>
            s.salon_name.toLowerCase().includes(q) ||
            s.city?.toLowerCase().includes(q) ||
            s.address?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, salones]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 pt-12 pb-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">💅 Naiqo</h1>
            <p className="text-pink-100 text-sm">Encuentra tu salón perfecto</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white border border-white/30 hover:bg-white/20"
            onClick={() => navigate('/cliente/mis-citas')}
          >
            Mis citas
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar salón o ciudad..."
            className="pl-9 bg-white text-gray-900 border-0 rounded-xl h-11"
          />
        </div>
      </div>

      {/* Salones list */}
      <div className="px-4 py-5 space-y-3 max-w-lg mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Scissors className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No se encontraron salones</p>
            {search && (
              <button
                className="text-primary text-sm mt-2 underline"
                onClick={() => setSearch('')}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {filtered.length} salón{filtered.length !== 1 ? 'es' : ''} disponible{filtered.length !== 1 ? 's' : ''}
            </p>
            {filtered.map(salon => (
              <Card
                key={salon.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                onClick={() => navigate(`/reservar/${salon.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-lg font-bold">
                          {salon.salon_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{salon.salon_name}</p>
                        {(salon.city || salon.address) && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{salon.city || salon.address}</span>
                          </p>
                        )}
                        {salon.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{salon.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Button size="sm" className="h-8 bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 text-xs px-3">
                        <Calendar className="w-3 h-3 mr-1" />
                        Reservar
                      </Button>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-around max-w-lg mx-auto">
        <button className="flex flex-col items-center gap-1 text-primary">
          <Search className="w-5 h-5" />
          <span className="text-xs font-medium">Explorar</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-gray-400"
          onClick={() => navigate('/cliente/mis-citas')}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs">Mis citas</span>
        </button>
      </div>

      <div className="h-20" />
    </div>
  );
};

export default ClienteHome;
