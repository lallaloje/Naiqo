import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { MobileLayout } from '@/components/MobileLayout';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TouchButton } from '@/components/ui/touch-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Camera, 
  MessageCircle, 
  Calendar, 
  TrendingUp, 
  Lightbulb,
  ArrowRight,
  Clock,
  CheckCircle2,
  Package
} from 'lucide-react';
import { differenceInDays, format, eachDayOfInterval, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SalonData {
  salon_name: string;
  contact_name: string;
  trial_ends_at: string;
  subscription_status: string;
}

interface Analysis {
  id: string;
  created_at: string;
  image_url: string;
  diagnosis: unknown;
  client_name: string | null;
}

interface DailyStat {
  day: string;
  analyses: number;
}

const TIPS = [
  "El 60% de las clientas tienen deshidratación leve. Recomienda aceite de cutícula.",
  "Las uñas saludables crecen aproximadamente 3mm al mes. Programa retoques cada 2-3 semanas.",
  "La luz natural es clave para análisis precisos. Evita flash directo en las fotos.",
  "Ofrecer tratamientos preventivos aumenta la retención de clientas en un 40%.",
  "Las uñas reflejan la salud general. Pregunta por cambios en dieta o medicación.",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, demoSalon, demoAnalyses, demoAppointments } = useDemoMode();
  const isMobile = useIsMobile();
  const [salonData, setSalonData] = useState<SalonData | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [todayStats, setTodayStats] = useState({ analyses: 0, appointments: 0 });
  const [weeklyData, setWeeklyData] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipOfDay] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  const fetchDashboardData = useCallback(async () => {
    // Use demo data if in demo mode
    if (isDemoMode) {
      setSalonData({
        salon_name: demoSalon.salon_name,
        contact_name: demoSalon.contact_name,
        trial_ends_at: demoSalon.trial_ends_at,
        subscription_status: demoSalon.subscription_status,
      });

      // Convert demo analyses to the expected format
      const convertedAnalyses = demoAnalyses.slice(0, 5).map(a => ({
        id: a.id,
        created_at: a.created_at,
        image_url: a.image_url,
        diagnosis: a.diagnosis,
        client_name: a.client_name,
      }));
      setRecentAnalyses(convertedAnalyses);

      // Today's stats from demo data
      const today = new Date();
      const todayAnalyses = demoAnalyses.filter(a => 
        format(new Date(a.created_at), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      ).length;
      const todayAppointmentsCount = demoAppointments.filter(a =>
        format(new Date(a.start_time), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      ).length;

      setTodayStats({ analyses: todayAnalyses, appointments: todayAppointmentsCount });

      // Generate weekly data from demo
      const weekStart = subDays(new Date(), 6);
      const days = eachDayOfInterval({ start: weekStart, end: new Date() });
      const dailyStats = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = demoAnalyses.filter(a => 
          format(new Date(a.created_at), 'yyyy-MM-dd') === dayStr
        ).length;
        return {
          day: format(day, 'EEE', { locale: es }),
          analyses: count
        };
      });
      setWeeklyData(dailyStats);
      setLoading(false);
      return;
    }

    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch salon data
      const { data: salon } = await supabase
        .from('salons')
        .select('salon_name, contact_name, trial_ends_at, subscription_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (salon) setSalonData(salon);

      // Fetch recent analyses
      const { data: analyses } = await supabase
        .from('analyses')
        .select('id, created_at, image_url, diagnosis, client_name')
        .order('created_at', { ascending: false })
        .limit(5);

      if (analyses) setRecentAnalyses(analyses);

      // Fetch today's stats
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      
      const { count: todayAnalyses } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay);

      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', startOfDay)
        .lte('start_time', new Date().toISOString());

      setTodayStats({
        analyses: todayAnalyses || 0,
        appointments: todayAppointments || 0
      });

      // Fetch weekly data for chart
      const weekStart = subDays(new Date(), 6);
      const days = eachDayOfInterval({ start: weekStart, end: new Date() });
      
      const { data: weekAnalyses } = await supabase
        .from('analyses')
        .select('created_at')
        .gte('created_at', weekStart.toISOString());

      const dailyStats = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = weekAnalyses?.filter(a => 
          format(new Date(a.created_at!), 'yyyy-MM-dd') === dayStr
        ).length || 0;
        
        return {
          day: format(day, 'EEE', { locale: es }),
          analyses: count
        };
      });

      setWeeklyData(dailyStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode, demoSalon, demoAnalyses, demoAppointments]);

  useEffect(() => {
    fetchDashboardData();

    // Only subscribe to real-time updates if not in demo mode
    if (!isDemoMode) {
      const channel = supabase
        .channel('dashboard-analyses')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'analyses' },
          (payload) => {
            setRecentAnalyses(prev => [payload.new as Analysis, ...prev.slice(0, 4)]);
            setTodayStats(prev => ({ ...prev, analyses: prev.analyses + 1 }));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchDashboardData, isDemoMode]);

  const daysRemaining = salonData 
    ? differenceInDays(new Date(salonData.trial_ends_at), new Date())
    : 0;

  const quickActions = [
    { 
      icon: Camera, 
      label: 'Nuevo Análisis', 
      path: '/analisis-ungueal',
      color: 'bg-primary hover:bg-primary/90',
      textColor: 'text-primary-foreground'
    },
    { 
      icon: MessageCircle, 
      label: 'Asistente IA', 
      path: '/asistente-chat',
      color: 'bg-secondary hover:bg-secondary/90',
      textColor: 'text-secondary-foreground'
    },
    { 
      icon: Calendar, 
      label: 'Gestión Citas', 
      path: '/gestion-citas',
      color: 'bg-accent hover:bg-accent/90',
      textColor: 'text-accent-foreground'
    },
  ];

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-4 p-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );

  const DashboardContent = () => (
    <div className="space-y-4 p-4">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-none">
        <CardContent className="py-5">
          <div className="space-y-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Bienvenida, {salonData?.salon_name || 'tu salón'} 👋
              </h1>
              {salonData?.contact_name && (
                <p className="text-sm text-muted-foreground mt-1">
                  Hola, {salonData.contact_name}
                </p>
              )}
            </div>
            {salonData?.subscription_status === 'trial' && daysRemaining > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs py-1 px-2">
                  <Clock className="w-3 h-3 mr-1" />
                  {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} de prueba
                </Badge>
                <TouchButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/planes')}
                  className="text-xs h-8"
                >
                  Ver planes
                </TouchButton>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - Large touch targets */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Acciones Rápidas</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <TouchButton
              key={action.path}
              className={`${action.color} ${action.textColor} h-auto py-4 flex flex-col items-center gap-1.5 rounded-xl`}
              onClick={() => navigate(action.path)}
            >
              <action.icon className="w-7 h-7" />
              <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
            </TouchButton>
          ))}
        </div>
      </section>

      {/* Today Summary - Compact for mobile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Resumen de Hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Camera className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground">Análisis</span>
            </div>
            <span className="text-xl font-bold text-foreground">{todayStats.analyses}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-full">
                <Calendar className="w-4 h-4 text-secondary-foreground" />
              </div>
              <span className="text-sm text-foreground">Citas</span>
            </div>
            <span className="text-xl font-bold text-foreground">{todayStats.appointments}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-full">
                <Package className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-sm text-foreground">Stock</span>
            </div>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Próximamente
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Esta Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  width={20}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="analyses" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="Análisis"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Analyses */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Últimos Análisis
          </CardTitle>
          <TouchButton 
            variant="ghost" 
            size="sm" 
            className="text-primary h-8 text-xs"
            onClick={() => navigate('/analisis-ungueal')}
          >
            Ver todos <ArrowRight className="w-3 h-3 ml-1" />
          </TouchButton>
        </CardHeader>
        <CardContent>
          {recentAnalyses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aún no tienes análisis</p>
              <TouchButton 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => navigate('/analisis-ungueal')}
              >
                Realizar primer análisis
              </TouchButton>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAnalyses.map((analysis) => (
                <div 
                  key={analysis.id}
                  className="touch-list-item"
                  onClick={() => navigate('/analisis-ungueal')}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={analysis.image_url} 
                      alt="Análisis" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {analysis.client_name || 'Cliente sin nombre'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(analysis.created_at!), "dd MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0 text-xs">
                    {analysis.diagnosis ? 'OK' : '...'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tip of the Day */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-200/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-full flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">💡 Tip del Día</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{tipOfDay}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <MobileLayout 
        showBack={false} 
        showHeader={false}
        onRefresh={fetchDashboardData}
      >
        {loading ? <LoadingSkeleton /> : <DashboardContent />}
      </MobileLayout>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {loading ? <LoadingSkeleton /> : <DashboardContent />}
      </main>
      <Footer />
    </div>
  );
}
