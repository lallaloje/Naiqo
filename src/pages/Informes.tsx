import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Euro, Calendar, Users, XCircle, CheckCircle, Clock } from 'lucide-react';

interface MonthStats {
  revenue: number;
  completed: number;
  confirmed: number;
  cancelled: number;
  pending: number;
  uniqueClients: number;
  topServices: { name: string; count: number; revenue: number }[];
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const Informes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const start = new Date(year, month, 1).toISOString();
    const end   = new Date(year, month + 1, 1).toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .select('status, client_name, client_phone, services(name, price)')
      .eq('user_id', user.id)
      .gte('start_time', start)
      .lt('start_time', end);

    if (error || !data) { setLoading(false); return; }

    const apts = data as any[];
    const revenue = apts
      .filter(a => a.status === 'completed')
      .reduce((s, a) => s + (a.services?.price || 0), 0);

    const completed  = apts.filter(a => a.status === 'completed').length;
    const confirmed  = apts.filter(a => a.status === 'confirmed' || a.status === 'scheduled').length;
    const cancelled  = apts.filter(a => a.status === 'cancelled').length;
    const pending    = apts.filter(a => a.status === 'pending').length;

    const uniqueClients = new Set(
      apts.filter(a => a.status !== 'cancelled').map(a => a.client_phone || a.client_name)
    ).size;

    // Top servicios
    const svcMap = new Map<string, { count: number; revenue: number }>();
    for (const a of apts.filter(a => a.status === 'completed')) {
      const name = a.services?.name || 'Sin servicio';
      const price = a.services?.price || 0;
      const prev = svcMap.get(name) || { count: 0, revenue: 0 };
      svcMap.set(name, { count: prev.count + 1, revenue: prev.revenue + price });
    }
    const topServices = Array.from(svcMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    setStats({ revenue, completed, confirmed, cancelled, pending, uniqueClients, topServices });
    setLoading(false);
  }, [user, year, month]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return;
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/dashboard')} className="text-white/80 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Informes mensuales</h1>
        </div>
        <p className="text-pink-100 text-sm ml-8">Facturación y citas por mes</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Selector de mes */}
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-5 py-3">
          <button onClick={prevMonth} className="p-1 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="font-bold text-gray-900 text-lg">{MONTH_NAMES[month]}</p>
            <p className="text-xs text-gray-400">{year}</p>
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className={`p-1 rounded-full ${isCurrentMonth ? 'opacity-30 cursor-default' : 'hover:bg-gray-100'}`}
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : stats ? (
          <>
            {/* Facturación */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Euro className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Facturación</span>
                </div>
                <p className="text-4xl font-bold text-green-600">€{stats.revenue.toLocaleString('es-ES')}</p>
                <p className="text-xs text-gray-400 mt-1">de citas completadas</p>
              </CardContent>
            </Card>

            {/* Citas por estado */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Citas del mes</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.completed + stats.confirmed + stats.cancelled + stats.pending}</p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Completadas</p>
                      <p className="font-bold text-green-600 text-lg">{stats.completed}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                    <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Confirmadas</p>
                      <p className="font-bold text-blue-600 text-lg">{stats.confirmed}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Canceladas</p>
                      <p className="font-bold text-red-500 text-lg">{stats.cancelled}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                    <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Pendientes</p>
                      <p className="font-bold text-orange-500 text-lg">{stats.pending}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clientas */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clientas</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{stats.uniqueClients}</p>
                <p className="text-xs text-gray-400 mt-1">clientas distintas con cita no cancelada</p>
              </CardContent>
            </Card>

            {/* Top servicios */}
            {stats.topServices.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top servicios completados</span>
                  </div>
                  <div className="space-y-2">
                    {stats.topServices.map((svc, i) => (
                      <div key={svc.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                          <p className="text-sm font-medium text-gray-800 truncate max-w-[180px]">{svc.name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-green-600">€{svc.revenue.toLocaleString('es-ES')}</p>
                          <p className="text-xs text-gray-400">{svc.count} cita{svc.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {stats.completed === 0 && stats.confirmed === 0 && stats.cancelled === 0 && stats.pending === 0 && (
              <div className="text-center py-10">
                <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Sin citas en {MONTH_NAMES[month]} {year}</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Informes;
