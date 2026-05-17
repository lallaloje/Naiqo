import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MobileLayout } from '@/components/MobileLayout';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TouchButton } from '@/components/ui/touch-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Calendar, TrendingUp, ArrowRight, Clock,
  Users, Euro, CheckCircle2, XCircle, Scissors
} from 'lucide-react';
import { format, startOfMonth, startOfDay, endOfDay, eachDayOfInterval, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SalonData {
  salon_name: string;
  contact_name: string;
  trial_ends_at: string;
  subscription_status: string;
}

interface Appointment {
  id: string;
  client_name: string;
  start_time: string;
  end_time: string;
  status: string;
  services: { name: string; price: number | null } | null;
}

interface Stats {
  todayTotal: number;
  todayConfirmed: number;
  monthAppointments: number;
  monthRevenue: number;
  monthClients: number;
  monthCancelled: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [salonData, setSalonData]       = useState<SalonData | null>(null);
  const [todayApts,  setTodayApts]      = useState<Appointment[]>([]);
  const [stats,      setStats]          = useState<Stats | null>(null);
  const [chartData,  setChartData]      = useState<{ day: string; citas: number }[]>([]);
  const [loading,    setLoading]        = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // ── Salon info ────────────────────────────────────────────────
      const { data: salon } = await supabase
        .from('salons')
        .select('salon_name, contact_name, trial_ends_at, subscription_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (salon) setSalonData(salon);

      const now       = new Date();
      const todayStr  = format(now, 'yyyy-MM-dd');
      const monthStart = startOfMonth(now).toISOString();

      // ── Today's appointments ──────────────────────────────────────
      const { data: todayData } = await supabase
        .from('appointments')
        .select('id, client_name, start_time, end_time, status, services(name, price)')
        .eq('user_id', user.id)
        .gte('start_time', `${todayStr}T00:00:00`)
        .lte('start_time', `${todayStr}T23:59:59`)
        .order('start_time');
      setTodayApts((todayData as any) || []);

      // ── Month stats ───────────────────────────────────────────────
      const { data: monthData } = await supabase
        .from('appointments')
        .select('status, client_name, client_phone, services(price)')
        .eq('user_id', user.id)
        .gte('start_time', monthStart);

      const apts = (monthData as any[]) || [];
      const revenue = apts
        .filter(a => a.status === 'completed' || a.status === 'confirmed')
        .reduce((sum: number, a: any) => sum + (a.services?.price || 0), 0);
      const uniqueClients = new Set(
        apts.map((a: any) => a.client_phone || a.client_name)
      ).size;
      const cancelled = apts.filter((a: any) => a.status === 'cancelled').length;

      const todayAll = (todayData as any[]) || [];
      setStats({
        todayTotal:        todayAll.length,
        todayConfirmed:    todayAll.filter((a: any) => ['confirmed','scheduled','completed'].includes(a.status)).length,
        monthAppointments: apts.length,
        monthRevenue:      revenue,
        monthClients:      uniqueClients,
        monthCancelled:    cancelled,
      });

      // ── Weekly chart ──────────────────────────────────────────────
      const weekStart = subDays(now, 6);
      const days = eachDayOfInterval({ start: weekStart, end: now });

      const { data: weekData } = await supabase
        .from('appointments')
        .select('start_time, status')
        .eq('user_id', user.id)
        .gte('start_time', weekStart.toISOString())
        .neq('status', 'cancelled');

      const chart = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count  = (weekData || []).filter(a =>
          format(new Date(a.start_time), 'yyyy-MM-dd') === dayStr
        ).length;
        return { day: format(day, 'EEE', { locale: es }), citas: count };
      });
      setChartData(chart);

    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Helpers ───────────────────────────────────────────────────────
  const upcomingApts = todayApts.filter(a =>
    new Date(a.start_time) >= new Date() && a.status !== 'cancelled'
  );
  const pastApts = todayApts.filter(a =>
    new Date(a.start_time) < new Date() && a.status !== 'cancelled'
  );

  const STATUS_COLOR: Record<string, string> = {
    pending:   'bg-orange-100 text-orange-700',
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
  };
  const STATUS_LABEL: Record<string, string> = {
    pending: 'Pendiente', scheduled: 'Programada',
    confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada',
  };

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // ── Dashboard content ─────────────────────────────────────────────
  const content = (
    <div className="space-y-4 p-4">

      {/* Welcome */}
      <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-none">
        <CardContent className="py-4">
          <h1 className="text-lg font-bold">
            ¡Hola, {salonData?.salon_name || 'tu salón'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
          {salonData?.subscription_status === 'trial' && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Período de prueba
              </Badge>
              <button
                className="text-xs text-primary underline"
                onClick={() => navigate('/planes')}
              >
                Ver planes
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Citas hoy</span>
            </div>
            <p className="text-3xl font-bold">{stats?.todayTotal ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats?.todayConfirmed ?? 0} confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Ingresos mes</span>
            </div>
            <p className="text-3xl font-bold text-green-600">
              €{stats?.monthRevenue ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">servicios completados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Clientes mes</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {stats?.monthClients ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats?.monthAppointments ?? 0} citas en total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-muted-foreground">Cancelaciones</span>
            </div>
            <p className="text-3xl font-bold text-red-500">
              {stats?.monthCancelled ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming today */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-primary" />
            Próximas citas de hoy
          </CardTitle>
          <TouchButton variant="ghost" size="sm" className="text-primary h-8 text-xs"
            onClick={() => navigate('/gestion-citas')}>
            Ver todas <ArrowRight className="w-3 h-3 ml-1" />
          </TouchButton>
        </CardHeader>
        <CardContent>
          {upcomingApts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                {pastApts.length > 0
                  ? '¡Todas las citas de hoy completadas! 🎉'
                  : 'No hay citas programadas para hoy'}
              </p>
              <TouchButton variant="outline" size="sm" className="mt-3"
                onClick={() => navigate('/gestion-citas')}>
                <Calendar className="w-3.5 h-3.5 mr-1" /> Gestionar citas
              </TouchButton>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingApts.slice(0, 5).map(apt => {
                const start = new Date(apt.start_time);
                const end   = new Date(apt.end_time);
                return (
                  <div key={apt.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors"
                    onClick={() => navigate('/gestion-citas')}
                  >
                    <div className="text-center shrink-0 w-12">
                      <p className="text-sm font-bold text-primary leading-none">
                        {format(start, 'HH:mm')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(end, 'HH:mm')}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{apt.client_name}</p>
                      {apt.services && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Scissors className="w-3 h-3 shrink-0" />
                          {(apt.services as any).name}
                          {(apt.services as any).price ? ` · €${(apt.services as any).price}` : ''}
                        </p>
                      )}
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${STATUS_COLOR[apt.status] || ''}`}>
                      {STATUS_LABEL[apt.status] || apt.status}
                    </Badge>
                  </div>
                );
              })}
              {upcomingApts.length > 5 && (
                <p className="text-xs text-center text-muted-foreground pt-1">
                  +{upcomingApts.length - 5} más
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Citas últimos 7 días
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  width={20} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px', fontSize: '12px',
                  }}
                />
                <Bar dataKey="citas" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="Citas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout showBack={false} showHeader={false} onRefresh={fetchData}>
        {content}
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {content}
      </main>
      <Footer />
    </div>
  );
}
