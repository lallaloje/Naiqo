import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileLayout } from '@/components/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Clock, LogIn, LogOut, Coffee, Play, Users, Calendar, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Employee {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  notes: string | null;
}

function fmt(date: Date) {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(date: Date) {
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function duration(from: string, to: string | null): string {
  const ms = (to ? new Date(to) : new Date()).getTime() - new Date(from).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

function Clock12({ now }: { now: Date }) {
  return (
    <div className="text-center mb-6">
      <p className="text-5xl font-bold tabular-nums tracking-tight">
        {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-muted-foreground text-sm mt-1 capitalize">{fmtDate(now)}</p>
    </div>
  );
}

export default function FichajePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [now, setNow] = useState(new Date());
  const [salonId, setSalonId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: salon } = await supabase.from('salons').select('id').eq('user_id', user.id).maybeSingle();
      if (!salon) return;
      setSalonId(salon.id);

      const { data: emps } = await supabase.from('employees').select('id,name,color,active').eq('user_id', user.id).eq('active', true).order('name');
      setEmployees(emps || []);

      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data: entries } = await supabase.from('time_entries' as any)
        .select('*').eq('user_id', user.id)
        .gte('clock_in', todayStart.toISOString())
        .order('clock_in', { ascending: false });
      setTodayEntries((entries as TimeEntry[]) || []);

      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: hist } = await supabase.from('time_entries' as any)
        .select('*').eq('user_id', user.id)
        .gte('clock_in', weekAgo.toISOString())
        .lt('clock_in', todayStart.toISOString())
        .order('clock_in', { ascending: false });
      setHistoryEntries((hist as TimeEntry[]) || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeEntry = (empId: string) => todayEntries.find(e => e.employee_id === empId && !e.clock_out);
  const onBreak = (entry: TimeEntry | undefined) => !!(entry?.break_start && !entry?.break_end);

  const clockIn = async (emp: Employee) => {
    if (!salonId) return;
    const { error } = await supabase.from('time_entries' as any).insert({
      salon_id: salonId,
      user_id: user!.id,
      employee_id: emp.id,
      clock_in: new Date().toISOString(),
      notes: notes[emp.id] || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`${emp.name} ha fichado entrada`);
    setNotes(n => ({ ...n, [emp.id]: '' }));
    loadData();
  };

  const clockOut = async (emp: Employee) => {
    const entry = activeEntry(emp.id);
    if (!entry) return;
    const { error } = await supabase.from('time_entries' as any).update({ clock_out: new Date().toISOString() }).eq('id', entry.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${emp.name} ha fichado salida`);
    loadData();
  };

  const startBreak = async (emp: Employee) => {
    const entry = activeEntry(emp.id);
    if (!entry) return;
    const { error } = await supabase.from('time_entries' as any).update({ break_start: new Date().toISOString() }).eq('id', entry.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Descanso iniciado — ${emp.name}`);
    loadData();
  };

  const endBreak = async (emp: Employee) => {
    const entry = activeEntry(emp.id);
    if (!entry) return;
    const { error } = await supabase.from('time_entries' as any).update({ break_end: new Date().toISOString() }).eq('id', entry.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Descanso terminado — ${emp.name}`);
    loadData();
  };

  const empById = (id: string) => employees.find(e => e.id === id);

  const content = (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" /> Fichaje
        </h1>
        <p className="text-sm text-muted-foreground">Control de entrada y salida del equipo</p>
      </div>

      <Clock12 now={now} />

      {loading ? (
        <p className="text-center text-muted-foreground text-sm">Cargando...</p>
      ) : employees.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          No tienes empleadas activas. Añade empleadas en la sección Equipo.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {employees.map(emp => {
            const entry = activeEntry(emp.id);
            const inBreak = onBreak(entry);
            const isIn = !!entry;

            return (
              <Card key={emp.id} className={`transition-all ${inBreak ? 'border-amber-300' : isIn ? 'border-green-300' : ''}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: emp.color }}>
                      {initials(emp.name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{emp.name}</p>
                      {entry ? (
                        <p className="text-xs text-muted-foreground">
                          Entrada: {fmt(new Date(entry.clock_in))} · {inBreak ? '☕ En descanso' : `Trabajando ${duration(entry.clock_in, null)}`}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sin fichar hoy</p>
                      )}
                    </div>
                    <Badge className={
                      inBreak ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      isIn    ? 'bg-green-100 text-green-700 border-green-200' :
                                'bg-gray-100 text-gray-500'
                    }>
                      {inBreak ? 'Descanso' : isIn ? 'Trabajando' : 'Fuera'}
                    </Badge>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {!isIn && (
                      <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => clockIn(emp)}>
                        <LogIn className="w-3.5 h-3.5" /> Entrada
                      </Button>
                    )}
                    {isIn && !inBreak && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1 text-amber-600 border-amber-300" onClick={() => startBreak(emp)}>
                          <Coffee className="w-3.5 h-3.5" /> Descanso
                        </Button>
                        <Button size="sm" className="gap-1 bg-red-500 hover:bg-red-600 text-white" onClick={() => clockOut(emp)}>
                          <LogOut className="w-3.5 h-3.5" /> Salida
                        </Button>
                      </>
                    )}
                    {inBreak && (
                      <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => endBreak(emp)}>
                        <Play className="w-3.5 h-3.5" /> Volver al trabajo
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Today's summary */}
      {todayEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Resumen de hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayEntries.map(e => {
              const emp = empById(e.employee_id);
              if (!emp) return null;
              return (
                <div key={e.id} className="flex items-center justify-between py-1 border-b border-muted/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: emp.color }}>{initials(emp.name)}</div>
                    <div>
                      <p className="text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(new Date(e.clock_in))} → {e.clock_out ? fmt(new Date(e.clock_out)) : 'ahora'}
                        {e.break_start && ` · ☕ ${fmt(new Date(e.break_start))}${e.break_end ? `→${fmt(new Date(e.break_end))}` : ''}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {duration(e.clock_in, e.clock_out)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {historyEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowHistory(h => !h)}>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Últimos 7 días</span>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
          {showHistory && (
            <CardContent className="space-y-2">
              {historyEntries.map(e => {
                const emp = empById(e.employee_id);
                if (!emp) return null;
                const d = new Date(e.clock_in);
                return (
                  <div key={e.id} className="flex items-center justify-between py-1 border-b border-muted/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ background: emp.color }}>{initials(emp.name)}</div>
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {fmtDate(d)} · {fmt(d)} → {e.clock_out ? fmt(new Date(e.clock_out)) : '—'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {e.clock_out ? duration(e.clock_in, e.clock_out) : '—'}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );

  if (isMobile) return <MobileLayout title="Fichaje" showBack={true}>{content}</MobileLayout>;
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 pt-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 gap-1 mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver
          </Button>
        </div>
        {content}
      </main>
      <Footer />
    </div>
  );
}
