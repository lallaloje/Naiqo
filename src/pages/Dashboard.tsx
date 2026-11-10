import { useState, useEffect, useCallback, useRef } from 'react';
import jsQR from 'jsqr';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
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
  Users, Euro, CheckCircle2, XCircle, Scissors,
  BarChart3, Sparkles, Star, BookOpen, Download, Gift, Camera, X
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [salonData, setSalonData]       = useState<SalonData | null>(null);
  const [todayApts,  setTodayApts]      = useState<Appointment[]>([]);
  const [stats,      setStats]          = useState<Stats | null>(null);
  const [chartData,  setChartData]      = useState<{ day: string; citas: number }[]>([]);
  const [employeeStats, setEmployeeStats] = useState<{ name: string; color: string; citas: number; revenue: number; cancelled: number }[]>([]);
  const [loading,    setLoading]        = useState(true);

  // ── Gift card redemption ──────────────────────────────────────────
  const [giftCode,     setGiftCode]     = useState('');
  const [giftResult,   setGiftResult]   = useState<null | { found: boolean; card?: any; error?: string }>(null);
  const [giftLoading,  setGiftLoading]  = useState(false);
  const [salonId,      setSalonId]      = useState<string | null>(null);
  const [scanning,     setScanning]     = useState(false);
  const scanningRef = useRef(false);
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const canvasRef   = useRef<HTMLCanvasElement | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast.success('¡Suscripción activada! Bienvenida a NAIQO 🎉');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // ── Salon info ────────────────────────────────────────────────
      const { data: salon } = await supabase
        .from('salons')
        .select('id, salon_name, contact_name, trial_ends_at, subscription_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (salon) {
        setSalonData(salon);
        setSalonId((salon as any).id);
      }

      const now       = new Date();
      const todayStr  = format(now, 'yyyy-MM-dd');
      const monthStart = startOfMonth(now).toISOString();

      // ── Today's appointments ──────────────────────────────────────
      const { data: todayData } = await supabase
        .from('appointments')
        .select('id, client_name, start_time, end_time, status, services(name, price)')
        .eq('user_id', user.id)
        .gte('start_time', `${todayStr}T00:00:00+01:00`)
        .lte('start_time', `${todayStr}T23:59:59+02:00`)
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
        .filter(a => a.status === 'completed')
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

      // ── Employee stats (month) ────────────────────────────────────
      const { data: empData } = await supabase
        .from('employees')
        .select('id, name, color')
        .eq('user_id', user.id)
        .eq('active' as any, true);

      if (empData && empData.length > 0) {
        const { data: empApts } = await supabase
          .from('appointments')
          .select('employee_id, status, services(price)')
          .eq('user_id', user.id)
          .gte('start_time', monthStart)
          .not('employee_id', 'is', null);

        const aptsByEmp = (empApts as any[]) || [];
        const empStats = (empData as any[]).map(emp => {
          const mine = aptsByEmp.filter((a: any) => a.employee_id === emp.id);
          const revenue = mine
            .filter((a: any) => a.status === 'completed' || a.status === 'confirmed')
            .reduce((sum: number, a: any) => sum + (a.services?.price || 0), 0);
          return {
            name: emp.name,
            color: emp.color || '#d946ef',
            citas: mine.filter((a: any) => a.status !== 'cancelled').length,
            revenue,
            cancelled: mine.filter((a: any) => a.status === 'cancelled').length,
          };
        }).filter(e => e.citas > 0 || e.cancelled > 0)
          .sort((a, b) => b.citas - a.citas);

        setEmployeeStats(empStats);
      }

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

  // ── Gift card helpers ─────────────────────────────────────────────
  const startQrScan = async () => {
    scanningRef.current = true;
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const scan = async () => {
        if (!scanningRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height);
            if (result?.data) {
              const raw = result.data;
              const code = raw.includes('/') ? raw.split('/').pop()! : raw;
              stopQrScan();
              setGiftCode(code.toUpperCase());
              setTimeout(() => lookupGiftCardCode(code.toUpperCase()), 100);
              return;
            }
          }
        }
        if (scanningRef.current) requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } catch {
      toast.error('No se pudo acceder a la cámara. Comprueba los permisos del navegador.');
      scanningRef.current = false;
      setScanning(false);
    }
  };

  const stopQrScan = () => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const lookupGiftCardCode = async (code: string) => {
    if (!code.trim() || !salonId) return;
    setGiftLoading(true);
    setGiftResult(null);
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('salon_id', salonId)
      .maybeSingle();
    if (error || !data) {
      setGiftResult({ found: false, error: 'Código no encontrado o no pertenece a este salón.' });
    } else if (data.status === 'redeemed') {
      setGiftResult({ found: true, card: data, error: 'Esta tarjeta ya fue canjeada.' });
    } else if (new Date(data.expires_at) < new Date()) {
      setGiftResult({ found: true, card: data, error: 'Esta tarjeta ha caducado.' });
    } else {
      setGiftResult({ found: true, card: data });
    }
    setGiftLoading(false);
  };

  const lookupGiftCard = async () => {
    await lookupGiftCardCode(giftCode);
  };

  const redeemGiftCard = async () => {
    if (!giftResult?.card) return;
    setGiftLoading(true);
    const { error } = await supabase
      .from('gift_cards')
      .update({ status: 'redeemed', used_at: new Date().toISOString() })
      .eq('id', giftResult.card.id);
    if (error) {
      console.error('Redeem error:', error);
      toast.error(`Error: ${error.message || error.code || 'desconocido'}`);
    } else {
      toast.success('¡Tarjeta regalo canjeada correctamente! 🎉');
      setGiftResult({ found: true, card: { ...giftResult.card, status: 'redeemed' } });
      setGiftCode('');
    }
    setGiftLoading(false);
  };

  // ── Exportar CSV ─────────────────────────────────────────────────
  const exportCSV = async () => {
    if (!user) return;
    const monthStart = startOfMonth(new Date()).toISOString();
    const { data } = await supabase
      .from('appointments')
      .select('client_name, client_phone, client_email, start_time, end_time, status, services(name, price)')
      .eq('user_id', user.id)
      .gte('start_time', monthStart)
      .order('start_time');

    if (!data || data.length === 0) {
      toast('No hay citas este mes para exportar.');
      return;
    }

    const rows = [
      ['Fecha', 'Hora inicio', 'Hora fin', 'Cliente', 'Teléfono', 'Email', 'Servicio', 'Precio (€)', 'Estado'],
      ...(data as any[]).map(a => [
        format(new Date(a.start_time), 'dd/MM/yyyy'),
        format(new Date(a.start_time), 'HH:mm'),
        format(new Date(a.end_time), 'HH:mm'),
        a.client_name || '',
        a.client_phone || '',
        a.client_email || '',
        a.services?.name || '',
        a.services?.price ?? '',
        STATUS_LABEL[a.status] || a.status,
      ])
    ];

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citas-${format(new Date(), 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Este mes</p>
        <TouchButton variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={exportCSV}>
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </TouchButton>
      </div>
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

      {/* Employee stats */}
      {employeeStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="w-4 h-4 text-primary" />
              Rendimiento del equipo — {format(new Date(), 'MMMM', { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {employeeStats.map(emp => {
              const max = employeeStats[0].citas || 1;
              const pct = Math.round((emp.citas / max) * 100);
              return (
                <div key={emp.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: emp.color }}
                      />
                      <span className="font-medium">{emp.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{emp.citas} citas
                      </span>
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <Euro className="w-3 h-3" />{emp.revenue}
                      </span>
                      {emp.cancelled > 0 && (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="w-3 h-3" />{emp.cancelled}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: emp.color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tarjetas regalo — canjear */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="w-4 h-4 text-purple-500" />
            Canjear tarjeta regalo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scanning ? (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-48 object-cover"
                playsInline muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-36 h-36 border-2 border-white/70 rounded-xl" />
              </div>
              <TouchButton
                onClick={stopQrScan}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 h-7 w-7"
              >
                <X className="w-4 h-4" />
              </TouchButton>
              <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs">Apunta al código QR</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={giftCode}
                onChange={e => { setGiftCode(e.target.value.toUpperCase()); setGiftResult(null); }}
                onKeyDown={e => e.key === 'Enter' && lookupGiftCard()}
                placeholder="Código (ej: OLALLA5E)"
                maxLength={12}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <TouchButton
                onClick={startQrScan}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-3"
                title="Escanear QR"
              >
                <Camera className="w-4 h-4" />
              </TouchButton>
              <TouchButton
                onClick={lookupGiftCard}
                disabled={giftLoading || !giftCode.trim()}
                className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl px-4"
              >
                {giftLoading ? '…' : 'Buscar'}
              </TouchButton>
            </div>
          )}

          {giftResult && (
            <div className={`rounded-xl p-3 ${giftResult.error ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
              {giftResult.error ? (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" /> {giftResult.error}
                </p>
              ) : giftResult.card && (
                <>
                  <div className="space-y-1 mb-3">
                    <p className="text-sm font-semibold text-green-800 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Tarjeta válida
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Servicio:</span> {giftResult.card.service_name}
                      {' · '}
                      <span className="font-medium text-purple-600">€{(giftResult.card.price_cents / 100).toFixed(2)}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Para:</span> {giftResult.card.recipient_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Caduca:</span> {format(new Date(giftResult.card.expires_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  {giftResult.card.status !== 'redeemed' ? (
                    <TouchButton
                      onClick={redeemGiftCard}
                      disabled={giftLoading}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-xl"
                    >
                      {giftLoading ? 'Canjeando…' : '✓ Marcar como canjeada'}
                    </TouchButton>
                  ) : (
                    <p className="text-sm text-center text-green-700 font-medium">✓ Canjeada correctamente</p>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    {/* Herramientas IA — solo escritorio */}
    {!isMobile && (
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> Herramientas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Predicción de demanda', desc: 'Anticipa tus épocas más ocupadas', icon: BarChart3, path: '/prediccion-demanda', color: 'text-purple-500', bg: 'bg-purple-50' },
            { label: 'Análisis ungueal', desc: 'Diagnóstico asistido por IA', icon: Sparkles, path: '/analisis-ungueal', color: 'text-pink-500', bg: 'bg-pink-50' },
            { label: 'Recomendaciones', desc: 'Tratamientos personalizados', icon: Star, path: '/recomendador-tratamientos', color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Base de conocimientos', desc: 'Afecciones ungueales', icon: BookOpen, path: '/nail-conditions', color: 'text-blue-500', bg: 'bg-blue-50' },
          ].map(item => (
            <Card key={item.path} className="cursor-pointer hover:shadow-md transition-all group"
              onClick={() => navigate(item.path)}>
              <CardContent className="p-4 flex flex-col gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <p className="font-semibold text-sm leading-tight">{item.label}</p>
                <p className="text-xs text-muted-foreground leading-tight">{item.desc}</p>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors mt-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )}

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
