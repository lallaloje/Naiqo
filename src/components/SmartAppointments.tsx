import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BookingLinkCard from "@/components/BookingLinkCard";
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  Mail,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  Scissors,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  X,
  LayoutGrid,
  List,
  AlertCircle,
  Edit3
} from "lucide-react";
import { logError } from '@/lib/logger';

// ─── Calendar layout constants ───────────────────────────────────
const HOUR_HEIGHT = 64;   // px per hour
const START_HOUR  = 8;    // 08:00
const END_HOUR    = 22;   // 22:00
const TOTAL_HOURS = END_HOUR - START_HOUR;

// ─── Service color palette ────────────────────────────────────────
const PALETTES = [
  { bg: 'bg-pink-100',   border: 'border-l-pink-400',   text: 'text-pink-900'   },
  { bg: 'bg-purple-100', border: 'border-l-purple-400', text: 'text-purple-900' },
  { bg: 'bg-blue-100',   border: 'border-l-blue-400',   text: 'text-blue-900'   },
  { bg: 'bg-green-100',  border: 'border-l-green-400',  text: 'text-green-900'  },
  { bg: 'bg-yellow-100', border: 'border-l-yellow-400', text: 'text-yellow-900' },
  { bg: 'bg-orange-100', border: 'border-l-orange-400', text: 'text-orange-900' },
  { bg: 'bg-teal-100',   border: 'border-l-teal-400',   text: 'text-teal-900'   },
  { bg: 'bg-rose-100',   border: 'border-l-rose-400',   text: 'text-rose-900'   },
];

// ─── Interfaces ───────────────────────────────────────────────────
interface Appointment {
  id: string;
  salon_id: string;
  service_id: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  source: string | null;
  created_at: string;
  stripe_payment_method_id: string | null;
  stripe_customer_id: string | null;
  cancellation_charged: boolean | null;
}

interface Service {
  id: string;
  salon_id: string | null;
  name: string;
  duration_minutes: number;
  price: number | null;
  active: boolean;
}

interface AptPosition {
  top: number;
  height: number;
  col: number;
  totalCols: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending:    '⏳ Pendiente',
  scheduled:  'Programada', confirmed: 'Confirmada',
  completed:  'Completada', cancelled: 'Cancelada', no_show: 'No asistió',
};
const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-orange-100 text-orange-800 border-orange-300',
  scheduled:  'bg-blue-100 text-blue-800 border-blue-200',
  confirmed:  'bg-green-100 text-green-800 border-green-200',
  completed:  'bg-gray-100 text-gray-600 border-gray-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200',
  no_show:    'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const DEFAULT_SERVICES = [
  { name: 'Manicura clásica',          duration_minutes: 45,  price: 20 },
  { name: 'Manicura semipermanente',   duration_minutes: 60,  price: 30 },
  { name: 'Uñas de gel',               duration_minutes: 90,  price: 45 },
  { name: 'Uñas acrílicas',            duration_minutes: 120, price: 55 },
  { name: 'Pedicura',                  duration_minutes: 60,  price: 35 },
  { name: 'Nail art',                  duration_minutes: 30,  price: 15 },
  { name: 'Tratamiento hidratación',   duration_minutes: 30,  price: 20 },
  { name: 'Extensiones de uñas',       duration_minutes: 120, price: 60 },
];

// ─── Helpers ──────────────────────────────────────────────────────
function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }

function getWeekDays(dateStr: string): string[] {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7)); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return toDateStr(dd);
  });
}

function aptPosition(apt: Appointment): AptPosition {
  const s = new Date(apt.start_time);
  const e = new Date(apt.end_time);
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = e.getHours() + e.getMinutes() / 60;
  const top    = (sh - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max((eh - sh) * HOUR_HEIGHT, 28);
  return { top, height, col: 0, totalCols: 1 };
}

function assignColumns(apts: Appointment[]): Map<string, AptPosition> {
  const map = new Map<string, AptPosition>();
  const sorted = [...apts].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  // Group overlapping appointments
  const groups: Appointment[][] = [];
  sorted.forEach(apt => {
    const as_ = new Date(apt.start_time).getTime();
    const ae  = new Date(apt.end_time).getTime();
    let placed = false;
    for (const g of groups) {
      for (const other of g) {
        const os = new Date(other.start_time).getTime();
        const oe = new Date(other.end_time).getTime();
        if (as_ < oe && ae > os) { g.push(apt); placed = true; break; }
      }
      if (placed) break;
    }
    if (!placed) groups.push([apt]);
  });

  groups.forEach(g => {
    g.forEach((apt, idx) => {
      map.set(apt.id, { ...aptPosition(apt), col: idx, totalCols: g.length });
    });
  });
  return map;
}

function whatsappUrl(phone: string, message: string) {
  const clean = phone.replace(/[\s\-()]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function mailtoUrl(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Component ────────────────────────────────────────────────────
const SmartAppointments = () => {
  const [appointments, setAppointments]   = useState<Appointment[]>([]);
  const [weekApts,     setWeekApts]        = useState<Record<string, Appointment[]>>({});
  const [services,     setServices]        = useState<Service[]>([]);
  const [salonId,      setSalonId]         = useState<string | null>(null);
  const [salonName,    setSalonName]       = useState('Mi salón');
  const [selectedDate, setSelectedDate]   = useState(toDateStr(new Date()));
  const [view,         setView]            = useState<'day' | 'week'>('day');
  const [selectedApt,  setSelectedApt]    = useState<Appointment | null>(null);
  const [showForm,     setShowForm]        = useState(false);
  const [prefillTime,  setPrefillTime]    = useState('');
  const [isLoading,    setIsLoading]       = useState(false);
  const [pageLoading,  setPageLoading]    = useState(true);
  const [showNewSvc,   setShowNewSvc]      = useState(false);
  const [pendingApts,  setPendingApts]     = useState<Appointment[]>([]);
  const calendarRef = useRef<HTMLDivElement>(null);

  const { user }  = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    client_name: '', client_email: '', client_phone: '',
    service_id: '', appointment_time: '', notes: '',
  });
  const [svcForm, setSvcForm] = useState({
    name: '', duration_minutes: 60, price: '', description: '',
  });

  // ─── Load on mount ──────────────────────────────────────────────
  useEffect(() => { if (user) loadSalon(); }, [user]);
  useEffect(() => { if (salonId) { loadDayAppointments(); loadWeekAppointments(); loadServices(); loadPendingAppointments(); } }, [salonId, selectedDate]);

  const loadSalon = async () => {
    setPageLoading(true);
    try {
      const { data } = await supabase.from('salons').select('id, salon_name').eq('user_id', user!.id).single();
      if (data) { setSalonId(data.id); setSalonName(data.salon_name || 'Mi salón'); }
    } catch (e) { logError('SmartAppointments:loadSalon', e); }
    finally { setPageLoading(false); }
  };

  const loadDayAppointments = async () => {
    const { data } = await supabase.from('appointments').select('*')
      .eq('user_id', user!.id).gte('start_time', `${selectedDate}T00:00:00`).lte('start_time', `${selectedDate}T23:59:59`)
      .order('start_time');
    setAppointments(data || []);
  };

  const loadWeekAppointments = async () => {
    const days = getWeekDays(selectedDate);
    const from = days[0] + 'T00:00:00';
    const to   = days[6] + 'T23:59:59';
    const { data } = await supabase.from('appointments').select('*')
      .eq('user_id', user!.id).gte('start_time', from).lte('start_time', to);
    const byDay: Record<string, Appointment[]> = {};
    days.forEach(d => { byDay[d] = []; });
    (data || []).forEach(a => {
      const d = toDateStr(new Date(a.start_time));
      if (byDay[d]) byDay[d].push(a);
    });
    setWeekApts(byDay);
  };

  const loadPendingAppointments = async () => {
    const { data } = await supabase.from('appointments').select('*')
      .eq('user_id', user!.id).eq('status', 'pending').order('start_time');
    setPendingApts(data || []);
  };

  const loadServices = async () => {
    const { data } = await supabase.from('services').select('*')
      .eq('user_id', user!.id).eq('active', true).order('name');
    setServices(data || []);
  };

  // ─── Appointment CRUD ───────────────────────────────────────────
  const createAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) return;
    setIsLoading(true);
    try {
      const svc = services.find(s => s.id === form.service_id);
      const dur = svc?.duration_minutes || 60;
      const timeValue = form.appointment_time || prefillTime;
      if (!timeValue) throw new Error('Por favor selecciona una hora');
      const start = new Date(`${selectedDate}T${timeValue}:00`);
      const end   = new Date(start.getTime() + dur * 60000);

      const { error } = await supabase.from('appointments').insert({
        salon_id: salonId, user_id: user!.id, service_id: form.service_id || null,
        client_name: form.client_name, client_email: form.client_email || null,
        client_phone: form.client_phone || null, start_time: start.toISOString(),
        end_time: end.toISOString(), status: 'scheduled', notes: form.notes || null,
      } as any);
      if (error) throw error;
      setForm({ client_name:'', client_email:'', client_phone:'', service_id:'', appointment_time:'', notes:'' });
      setShowForm(false);
      loadDayAppointments(); loadWeekAppointments();
      toast({ title: '✅ Cita creada', description: `${form.client_name} — ${form.appointment_time}` });
    } catch (e: any) {
      logError('SmartAppointments:create', e);
      const msg = e?.message || e?.error_description || JSON.stringify(e) || 'Error desconocido';
      toast({ title: 'Error al crear cita', description: msg, variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    loadDayAppointments(); loadWeekAppointments(); loadPendingAppointments();
    if (selectedApt?.id === id) setSelectedApt(prev => prev ? { ...prev, status } : null);
    toast({ title: 'Estado actualizado', description: STATUS_LABEL[status] });
  };

  const chargeNoShow = async (aptId: string, price: number) => {
    if (!confirm(`¿Cobrar €${(price * 0.5).toFixed(2)} de penalización por cancelación/no-show?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke('charge-cancellation', {
        body: { appointmentId: aptId },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Error desconocido');
      toast({ title: `✅ Cobrado €${data.amount_euros}`, description: 'La penalización se ha procesado correctamente.' });
      loadDayAppointments(); loadWeekAppointments();
      setSelectedApt(null);
    } catch (err: any) {
      toast({ title: 'Error al cobrar', description: err.message, variant: 'destructive' });
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm('¿Eliminar esta cita?')) return;
    await supabase.from('appointments').delete().eq('id', id);
    setSelectedApt(null);
    loadDayAppointments(); loadWeekAppointments();
    toast({ title: 'Cita eliminada' });
  };

  // ─── Services CRUD ──────────────────────────────────────────────
  const createService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('services').insert({
        salon_id: salonId, user_id: user!.id, name: svcForm.name,
        duration_minutes: Number(svcForm.duration_minutes),
        price: svcForm.price ? Number(svcForm.price) : null,
        description: svcForm.description || null, active: true,
        center_id: null,
      } as any);
      if (error) throw error;
      setSvcForm({ name: '', duration_minutes: 60, price: '', description: '' });
      setShowNewSvc(false);
      loadServices();
      toast({ title: '✅ Servicio añadido', description: svcForm.name });
    } catch (e) {
      logError('SmartAppointments:createService', e);
      toast({ title: 'Error', description: 'No se pudo crear el servicio.', variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const addDefaultServices = async () => {
    if (!salonId) return;
    setIsLoading(true);
    try {
      await supabase.from('services').insert(
        DEFAULT_SERVICES.map(s => ({ ...s, salon_id: salonId, user_id: user!.id, active: true, center_id: null })) as any
      );
      loadServices();
      toast({ title: '✅ 8 servicios añadidos' });
    } catch (e) {
      logError('SmartAppointments:addDefault', e);
    } finally { setIsLoading(false); }
  };

  const deleteService = async (id: string) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await supabase.from('services').delete().eq('id', id);
    loadServices();
  };

  // ─── Reminder helpers ───────────────────────────────────────────
  const buildWaMessage = (apt: Appointment) => {
    const svc  = services.find(s => s.id === apt.service_id);
    const dt   = new Date(apt.start_time);
    const date = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const time = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `Hola ${apt.client_name} 😊\n\nTe recordamos que tienes cita en *${salonName}* el *${date}* a las *${time}*${svc ? ` para *${svc.name}*` : ''}.\n\n¡Te esperamos! 💅\n\nSi necesitas cambiar tu cita, escríbenos por aquí.`;
  };

  const buildEmailSubject = (apt: Appointment) => {
    const dt = new Date(apt.start_time);
    const date = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const time = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `Recordatorio de tu cita en ${salonName} — ${date} a las ${time}`;
  };

  const buildEmailBody = (apt: Appointment) => {
    const svc  = services.find(s => s.id === apt.service_id);
    const dt   = new Date(apt.start_time);
    const date = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const time = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `Hola ${apt.client_name},\n\nTe recordamos que tienes cita en ${salonName} el ${date} a las ${time}${svc ? ` para ${svc.name}` : ''}.\n\n¡Te esperamos!\n\nSi necesitas cambiar tu cita, por favor contáctanos con antelación.\n\nUn saludo,\n${salonName}`;
  };

  // ─── Current time helpers ───────────────────────────────────────
  const isToday = selectedDate === toDateStr(new Date());
  const nowTop = (() => {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < START_HOUR || h > END_HOUR) return null;
    return (h - START_HOUR) * HOUR_HEIGHT;
  })();

  const serviceColor = (serviceId: string | null) => {
    if (!serviceId) return PALETTES[0];
    const idx = services.findIndex(s => s.id === serviceId);
    return PALETTES[Math.max(idx, 0) % PALETTES.length];
  };

  const positions = assignColumns(appointments);

  // ─── Date navigation ────────────────────────────────────────────
  const changeDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateStr(d));
  };

  const formatDayLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = toDateStr(new Date());
    const tmrw  = toDateStr(new Date(Date.now() + 86400000));
    if (dateStr === today) return 'Hoy';
    if (dateStr === tmrw)  return 'Mañana';
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const weekDays   = getWeekDays(selectedDate);
  const DAY_NAMES  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const today      = toDateStr(new Date());

  // ─── Scroll to first appointment or 8am on load ─────────────────
  useEffect(() => {
    if (calendarRef.current && appointments.length > 0) {
      const firstTime = new Date(appointments[0].start_time);
      const h = firstTime.getHours() + firstTime.getMinutes() / 60;
      calendarRef.current.scrollTop = Math.max((h - START_HOUR - 1) * HOUR_HEIGHT, 0);
    }
  }, [appointments]);

  if (!user) return (
    <div className="max-w-xl mx-auto p-6 text-center">
      <Button onClick={() => window.location.href = '/auth'}>Iniciar Sesión</Button>
    </div>
  );
  if (pageLoading) return (
    <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Cargando agenda...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Agenda
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{formatDayLabel(selectedDate)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={view === 'day' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('day')}>
              <List className="w-4 h-4 mr-1" /> Día
            </Button>
            <Button variant={view === 'week' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('week')}>
              <LayoutGrid className="w-4 h-4 mr-1" /> Semana
            </Button>
          </div>
          <Button
            onClick={() => { setPrefillTime(''); setShowForm(true); setSelectedApt(null); }}
            className="bg-gradient-primary text-white"
          >
            <Plus className="w-4 h-4 mr-1" /> Nueva Cita
          </Button>
        </div>
      </div>

      <Tabs defaultValue="agenda">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="agenda"><CalendarIcon className="w-4 h-4 mr-1" />Agenda</TabsTrigger>
          <TabsTrigger value="servicios"><Scissors className="w-4 h-4 mr-1" />Servicios</TabsTrigger>
        </TabsList>

        {/* ══════════════ AGENDA TAB ══════════════ */}
        <TabsContent value="agenda" className="space-y-3 mt-3">

          {/* Booking link */}
          <BookingLinkCard />

          {/* ── Pending online bookings alert ── */}
          {(() => {
            const pending = pendingApts;
            if (pending.length === 0) return null;
            return (
              <div className="bg-orange-50 border border-orange-300 rounded-xl p-3 flex flex-col gap-2">
                <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {pending.length} cita{pending.length !== 1 ? 's' : ''} online pendiente{pending.length !== 1 ? 's' : ''} de confirmar
                </p>
                <div className="flex flex-col gap-1.5">
                  {pending.map(apt => {
                    const svc = services.find(s => s.id === apt.service_id);
                    const dt  = new Date(apt.start_time);
                    return (
                      <div key={apt.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-200">
                        <div>
                          <p className="text-sm font-medium text-orange-900">{apt.client_name}</p>
                          <p className="text-xs text-orange-600">
                            {dt.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})} · {dt.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
                            {svc ? ` · ${svc.name}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs px-2"
                            onClick={() => { updateStatus(apt.id, 'confirmed'); setSelectedDate(toDateStr(dt)); }}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Confirmar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-red-600 border-red-200 hover:bg-red-50 text-xs px-2"
                            onClick={() => updateStatus(apt.id, 'cancelled')}>
                            <XCircle className="w-3 h-3 mr-1" /> Rechazar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Date navigation bar */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeDate(view === 'week' ? -7 : -1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(toDateStr(new Date()))}>
              Hoy
            </Button>
            <div className="flex-1 text-center font-medium capitalize text-sm hidden md:block">
              {view === 'week'
                ? `${new Date(weekDays[0]+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})} – ${new Date(weekDays[6]+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}`
                : new Date(selectedDate+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
              }
            </div>
            <Button variant="outline" size="icon" onClick={() => changeDate(view === 'week' ? 7 : 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* ── WEEK VIEW ── */}
          {view === 'week' && (
            <Card>
              <CardContent className="p-3">
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day, i) => {
                    const dayApts = weekApts[day] || [];
                    const revenue = dayApts.reduce((s, a) => {
                      const sv = services.find(sv => sv.id === a.service_id);
                      return s + (sv?.price || 0);
                    }, 0);
                    const isSelected = day === selectedDate;
                    const isTodayDay = day === today;
                    return (
                      <button
                        key={day}
                        onClick={() => { setSelectedDate(day); setView('day'); }}
                        className={`rounded-xl p-2 text-center transition-all cursor-pointer border ${
                          isSelected ? 'bg-primary text-white border-primary' :
                          isTodayDay ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-muted'
                        }`}
                      >
                        <p className="text-xs font-medium">{DAY_NAMES[i]}</p>
                        <p className={`text-lg font-bold ${isSelected ? 'text-white' : ''}`}>
                          {new Date(day+'T12:00:00').getDate()}
                        </p>
                        <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {dayApts.length > 0 ? (
                            <>
                              <p>{dayApts.length} cita{dayApts.length !== 1 ? 's' : ''}</p>
                              {revenue > 0 && <p>€{revenue}</p>}
                            </>
                          ) : (
                            <p>—</p>
                          )}
                        </div>
                        {dayApts.length > 0 && (
                          <div className="flex justify-center gap-0.5 mt-1">
                            {dayApts.slice(0, 3).map((_, j) => (
                              <div key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── DAY VIEW ── */}
          {view === 'day' && (
            <div className="flex gap-4">
              {/* Calendar grid */}
              <div className="flex-1 min-w-0">
                <Card className="overflow-hidden">
                  <div
                    ref={calendarRef}
                    className="overflow-y-auto"
                    style={{ maxHeight: '75vh' }}
                  >
                    <div className="flex">
                      {/* Time labels */}
                      <div className="w-12 md:w-16 shrink-0 select-none">
                        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                          <div
                            key={i}
                            style={{ height: HOUR_HEIGHT }}
                            className="border-t border-muted/30 text-xs text-muted-foreground flex items-start px-1 pt-0.5"
                          >
                            {String(START_HOUR + i).padStart(2, '0')}:00
                          </div>
                        ))}
                      </div>

                      {/* Appointment area */}
                      <div
                        className="flex-1 relative border-l border-muted/30"
                        style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                      >
                        {/* Hour lines + click zones */}
                        {Array.from({ length: TOTAL_HOURS * 2 }, (_, i) => {
                          const h = Math.floor(i / 2) + START_HOUR;
                          const m = i % 2 === 0 ? '00' : '30';
                          return (
                            <div
                              key={i}
                              className="absolute w-full cursor-pointer hover:bg-primary/5 transition-colors"
                              style={{ top: i * (HOUR_HEIGHT / 2), height: HOUR_HEIGHT / 2 }}
                              onClick={() => {
                                setPrefillTime(`${String(h).padStart(2,'0')}:${m}`);
                                setShowForm(true);
                                setSelectedApt(null);
                              }}
                            >
                              {i % 2 === 1 && (
                                <div className="absolute top-0 left-0 right-0 border-t border-dashed border-muted/20" />
                              )}
                              {i % 2 === 0 && i > 0 && (
                                <div className="absolute top-0 left-0 right-0 border-t border-muted/30" />
                              )}
                            </div>
                          );
                        })}

                        {/* Current time indicator */}
                        {isToday && nowTop !== null && (
                          <div
                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                            style={{ top: nowTop }}
                          >
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
                            <div className="flex-1 h-0.5 bg-red-400" />
                          </div>
                        )}

                        {/* Appointment blocks */}
                        {appointments.map(apt => {
                          const pos    = positions.get(apt.id);
                          if (!pos) return null;
                          const svc    = services.find(s => s.id === apt.service_id);
                          const pal    = serviceColor(apt.service_id);
                          const colW   = `${100 / pos.totalCols}%`;
                          const colL   = `${(apt.service_id ? pos.col : 0) / pos.totalCols * 100}%`;
                          const isSelected = selectedApt?.id === apt.id;

                          const isPending = apt.status === 'pending';
                          return (
                            <div
                              key={apt.id}
                              className={`absolute rounded-lg border-l-4 px-2 py-1 cursor-pointer overflow-hidden transition-all z-10 select-none
                                ${isPending ? 'bg-orange-100 border-l-orange-500 text-orange-900 animate-pulse' : `${pal.bg} ${pal.border} ${pal.text}`}
                                ${apt.status === 'cancelled' ? 'opacity-40 line-through' : ''}
                                ${isSelected ? 'ring-2 ring-primary ring-offset-1 shadow-lg' : 'hover:shadow-md hover:z-20'}`}
                              style={{
                                top:    pos.top + 2,
                                height: pos.height - 4,
                                left:   `calc(${colL} + 2px)`,
                                width:  `calc(${colW} - 4px)`,
                              }}
                              onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); setShowForm(false); }}
                            >
                              <p className="font-semibold text-xs leading-tight truncate">
                                {isPending && '⏳ '}{apt.client_name}
                              </p>
                              {isPending && pos.height > 28 && (
                                <p className="text-xs font-medium opacity-90 leading-tight">Online · Pendiente</p>
                              )}
                              {!isPending && pos.height > 38 && svc && (
                                <p className="text-xs opacity-75 truncate leading-tight">{svc.name}</p>
                              )}
                              {pos.height > 58 && apt.client_phone && (
                                <p className="text-xs opacity-60 truncate">{apt.client_phone}</p>
                              )}
                              {pos.height > 76 && svc?.price && (
                                <p className="text-xs font-medium opacity-80">€{svc.price}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Day summary */}
                {appointments.filter(a => a.status !== 'cancelled').length > 0 && (
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2 px-1">
                    <span>🗓 <strong className="text-foreground">{appointments.filter(a=>a.status!=='cancelled').length}</strong> cita{appointments.filter(a=>a.status!=='cancelled').length!==1?'s':''}</span>
                    <span>✅ <strong className="text-green-700">{appointments.filter(a=>a.status==='confirmed'||a.status==='completed').length}</strong> confirmada{appointments.filter(a=>a.status==='confirmed'||a.status==='completed').length!==1?'s':''}</span>
                    <span>💰 <strong className="text-primary">€{appointments.filter(a=>a.status!=='cancelled').reduce((s,a)=>{const sv=services.find(sv=>sv.id===a.service_id);return s+(sv?.price||0);},0).toFixed(2)}</strong></span>
                  </div>
                )}
              </div>

              {/* ── Appointment detail / New form panel ── */}
              {(selectedApt || showForm) && (
                <div className="w-80 shrink-0">
                  <Card className="sticky top-4">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-base">
                        {showForm ? '➕ Nueva cita' : selectedApt?.client_name}
                      </CardTitle>
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => { setSelectedApt(null); setShowForm(false); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>

                      {/* ── NEW APPOINTMENT FORM ── */}
                      {showForm && (
                        <form onSubmit={createAppointment} className="space-y-3">
                          <div>
                            <Label className="text-xs">Nombre del cliente *</Label>
                            <Input placeholder="Ej: Ana García" value={form.client_name}
                              onChange={e => setForm({...form, client_name: e.target.value})} required />
                          </div>
                          <div>
                            <Label className="text-xs">Hora *</Label>
                            <Input type="time" value={form.appointment_time || prefillTime}
                              onChange={e => setForm({...form, appointment_time: e.target.value})}
                              onBlur={e => { if (!form.appointment_time && prefillTime) setForm(f => ({...f, appointment_time: prefillTime})); }}
                              required />
                          </div>
                          <div>
                            <Label className="text-xs">Teléfono (WhatsApp)</Label>
                            <Input placeholder="+34 600 000 000" value={form.client_phone}
                              onChange={e => setForm({...form, client_phone: e.target.value})} />
                          </div>
                          <div>
                            <Label className="text-xs">Email</Label>
                            <Input type="email" placeholder="cliente@email.com" value={form.client_email}
                              onChange={e => setForm({...form, client_email: e.target.value})} />
                          </div>
                          <div>
                            <Label className="text-xs">Servicio</Label>
                            {services.length === 0 ? (
                              <p className="text-xs text-muted-foreground mt-1 flex gap-1 items-center">
                                <AlertCircle className="w-3.5 h-3.5" /> Añade servicios primero
                              </p>
                            ) : (
                              <Select value={form.service_id} onValueChange={v => setForm({...form, service_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>
                                  {services.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name} · {s.duration_minutes}min{s.price ? ` · €${s.price}` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs">Notas</Label>
                            <Textarea rows={2} placeholder="Notas opcionales..."
                              value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                          </div>
                          <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : 'Guardar cita'}
                          </Button>
                        </form>
                      )}

                      {/* ── APPOINTMENT DETAIL ── */}
                      {selectedApt && !showForm && (() => {
                        const apt = selectedApt;
                        const svc = services.find(s => s.id === apt.service_id);
                        const start = new Date(apt.start_time);
                        const end   = new Date(apt.end_time);
                        const dur   = Math.round((end.getTime()-start.getTime())/60000);
                        const pal   = serviceColor(apt.service_id);
                        return (
                          <div className="space-y-4">
                            {/* Status badge */}
                            <Badge className={`border ${STATUS_COLOR[apt.status]||STATUS_COLOR.scheduled}`}>
                              {STATUS_LABEL[apt.status]||apt.status}
                            </Badge>

                            {/* Info */}
                            <div className={`rounded-lg p-3 ${pal.bg} ${pal.text} space-y-1`}>
                              <p className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 shrink-0" />
                                <span className="font-medium">
                                  {start.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})} → {end.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
                                  <span className="font-normal opacity-70"> ({dur} min)</span>
                                </span>
                              </p>
                              {svc && (
                                <p className="flex items-center gap-2 text-sm">
                                  <Scissors className="w-4 h-4 shrink-0" />
                                  {svc.name}{svc.price ? ` — €${svc.price}` : ''}
                                </p>
                              )}
                              {apt.client_phone && (
                                <p className="flex items-center gap-2 text-sm">
                                  <Phone className="w-4 h-4 shrink-0" />
                                  <a href={`tel:${apt.client_phone}`} className="hover:underline">{apt.client_phone}</a>
                                </p>
                              )}
                              {apt.client_email && (
                                <p className="flex items-center gap-2 text-sm">
                                  <Mail className="w-4 h-4 shrink-0" />
                                  <span className="break-all">{apt.client_email}</span>
                                </p>
                              )}
                              {apt.notes && (
                                <p className="text-sm opacity-75 italic mt-1">📝 {apt.notes}</p>
                              )}
                            </div>

                            {/* Reminder buttons */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">📬 Enviar recordatorio</p>
                              <div className="grid grid-cols-2 gap-2">
                                {apt.client_phone ? (
                                  <a
                                    href={whatsappUrl(apt.client_phone, buildWaMessage(apt))}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 transition-colors font-medium"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                  </a>
                                ) : (
                                  <button
                                    disabled
                                    className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-muted bg-muted/30 text-muted-foreground cursor-not-allowed"
                                    title="Sin número de teléfono"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                  </button>
                                )}
                                {apt.client_email ? (
                                  <a
                                    href={mailtoUrl(apt.client_email, buildEmailSubject(apt), buildEmailBody(apt))}
                                    className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors font-medium"
                                  >
                                    <Mail className="w-4 h-4" />
                                    Email
                                  </a>
                                ) : (
                                  <button
                                    disabled
                                    className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-muted bg-muted/30 text-muted-foreground cursor-not-allowed"
                                    title="Sin email"
                                  >
                                    <Mail className="w-4 h-4" />
                                    Email
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1.5 text-center">
                                Un clic → abre WhatsApp/email con el mensaje listo
                              </p>
                            </div>

                            {/* Pending online booking actions */}
                            {apt.status === 'pending' && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                                <p className="text-xs font-semibold text-orange-800 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> Cita online — requiere tu aprobación
                                </p>
                                <div className="flex gap-2">
                                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => updateStatus(apt.id, 'confirmed')}>
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirmar
                                  </Button>
                                  <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => updateStatus(apt.id, 'cancelled')}>
                                    <XCircle className="w-3.5 h-3.5 mr-1" /> Rechazar
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Status actions */}
                            {apt.status !== 'completed' && apt.status !== 'cancelled' && apt.status !== 'pending' && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Cambiar estado</p>
                                <div className="flex flex-wrap gap-2">
                                  {apt.status === 'scheduled' && (
                                    <Button size="sm" variant="outline" className="text-green-700 border-green-200 hover:bg-green-50"
                                      onClick={() => updateStatus(apt.id, 'confirmed')}>
                                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirmar
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" className="text-gray-700"
                                    onClick={() => updateStatus(apt.id, 'completed')}>
                                    <Star className="w-3.5 h-3.5 mr-1" /> Completada
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-yellow-700 border-yellow-200"
                                    onClick={() => updateStatus(apt.id, 'no_show')}>
                                    No asistió
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-600 border-red-200"
                                    onClick={() => updateStatus(apt.id, 'cancelled')}>
                                    <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelar
                                  </Button>
                                </div>
                              </div>
                            )}
                            {(apt.status === 'completed' || apt.status === 'cancelled') && (
                              <Button size="sm" variant="outline" className="text-blue-600"
                                onClick={() => updateStatus(apt.id, 'scheduled')}>
                                Volver a programar
                              </Button>
                            )}

                            {/* Cobrar penalización cancelación/no-show */}
                            {apt.stripe_payment_method_id &&
                              !apt.cancellation_charged &&
                              (apt.status === 'no_show' || apt.status === 'cancelled') &&
                              svc?.price && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                                <p className="text-xs font-semibold text-red-800">
                                  💳 Tarjeta guardada — política de cancelación
                                </p>
                                <p className="text-xs text-red-700">
                                  Penalización: <strong>€{(svc.price * 0.5).toFixed(2)}</strong> (50% de €{svc.price})
                                </p>
                                <Button
                                  size="sm"
                                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => chargeNoShow(apt.id, svc.price!)}
                                >
                                  Cobrar penalización (50%)
                                </Button>
                              </div>
                            )}
                            {apt.cancellation_charged && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                                <p className="text-xs text-gray-600">✅ Penalización ya cobrada</p>
                              </div>
                            )}

                            {/* Delete */}
                            <Button size="sm" variant="ghost" className="text-destructive w-full mt-1"
                              onClick={() => deleteAppointment(apt.id)}>
                              <Trash2 className="w-4 h-4 mr-1" /> Eliminar cita
                            </Button>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ══════════════ SERVICIOS TAB ══════════════ */}
        <TabsContent value="servicios" className="mt-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="w-4 h-4" /> Mis Servicios
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Configura los servicios de tu salón</p>
                </div>
                <Button size="sm" onClick={() => setShowNewSvc(!showNewSvc)}>
                  <Plus className="w-4 h-4 mr-1" /> Añadir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewSvc && (
                <Card className="mb-4 border-primary/30 bg-primary/5">
                  <CardContent className="pt-4">
                    <form onSubmit={createService} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label className="text-xs">Nombre *</Label>
                          <Input placeholder="Ej: Manicura semipermanente" value={svcForm.name}
                            onChange={e => setSvcForm({...svcForm, name: e.target.value})} required />
                        </div>
                        <div>
                          <Label className="text-xs">Duración (min) *</Label>
                          <Input type="number" min={5} value={svcForm.duration_minutes}
                            onChange={e => setSvcForm({...svcForm, duration_minutes: Number(e.target.value)})} required />
                        </div>
                        <div>
                          <Label className="text-xs">Precio (€)</Label>
                          <Input type="number" min={0} step="0.01" placeholder="Ej: 30" value={svcForm.price}
                            onChange={e => setSvcForm({...svcForm, price: e.target.value})} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar'}</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setShowNewSvc(false)}>Cancelar</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {services.length === 0 ? (
                <div className="text-center py-10">
                  <Scissors className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-medium mb-1">Sin servicios todavía</p>
                  <p className="text-sm text-muted-foreground mb-4">Añade los servicios que ofreces para asignarlos a las citas</p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={addDefaultServices} disabled={isLoading}>
                      ✨ Añadir 8 servicios típicos
                    </Button>
                    <Button onClick={() => setShowNewSvc(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Crear manualmente
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {services.map((svc, i) => (
                    <div key={svc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${PALETTES[i % PALETTES.length].border.replace('border-l-','bg-')}`} />
                        <div>
                          <p className="font-medium text-sm">{svc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {svc.duration_minutes} min{svc.price ? ` · €${svc.price}` : ''}
                          </p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteService(svc.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    {services.length} servicio{services.length!==1?'s':''} activo{services.length!==1?'s':''}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartAppointments;
