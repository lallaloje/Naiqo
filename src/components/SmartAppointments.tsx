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
const HOUR_HEIGHT   = 64;   // px per hour
const DEFAULT_START = 10;
const DEFAULT_END   = 21;

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
  category: string | null;
  description: string | null;
}

interface BlockedSlot {
  id: string;
  salon_id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
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

function aptPosition(apt: Appointment, startHour: number): AptPosition {
  const s = new Date(apt.start_time);
  const e = new Date(apt.end_time);
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = e.getHours() + e.getMinutes() / 60;
  const top    = (sh - startHour) * HOUR_HEIGHT;
  const height = Math.max((eh - sh) * HOUR_HEIGHT, 28);
  return { top, height, col: 0, totalCols: 1 };
}

function getMonthDays(year: number, month: number): (string | null)[] {
  const firstDay  = new Date(year, month, 1);
  const lastDay   = new Date(year, month + 1, 0);
  const startDow  = (firstDay.getDay() + 6) % 7; // Mon=0
  const days: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dd = new Date(year, month, d);
    days.push(toDateStr(dd));
  }
  return days;
}

function assignColumns(apts: Appointment[], startHour: number): Map<string, AptPosition> {
  const map = new Map<string, AptPosition>();
  const sorted = [...apts].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

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
      map.set(apt.id, { ...aptPosition(apt, startHour), col: idx, totalCols: g.length });
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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const SERVICE_CATEGORIES = ['Manicura', 'Pedicura', 'Nail Art', 'Tratamientos', 'Otros'];

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
  const [blockedSlots, setBlockedSlots]   = useState<BlockedSlot[]>([]);
  const [showBlockForm,setShowBlockForm]  = useState(false);
  const [blockForm,    setBlockForm]      = useState({ title: 'Descanso', time_start: '14:00', time_end: '16:00' });
  const [workStart,    setWorkStart]      = useState(DEFAULT_START);
  const [workEnd,      setWorkEnd]        = useState(DEFAULT_END);
  const [miniCalDate,  setMiniCalDate]    = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [showMiniCal,      setShowMiniCal]      = useState(false);
  const [weekBlockedSlots, setWeekBlockedSlots] = useState<Record<string, BlockedSlot[]>>({});
  const [clientHistory,    setClientHistory]    = useState<any[]>([]);
  const [historyLoading,   setHistoryLoading]   = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const { user }  = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    client_name: '', client_email: '', client_phone: '',
    service_id: '', appointment_time: '', notes: '',
  });
  const [svcForm, setSvcForm] = useState({
    name: '', duration_minutes: 60, price: '', description: '', category: '',
  });
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', duration_minutes: 60, price: '', description: '', category: '',
  });

  // ─── Load on mount ──────────────────────────────────────────────
  useEffect(() => { if (user) loadSalon(); }, [user]);
  useEffect(() => {
    if (salonId) {
      loadDayAppointments(); loadWeekAppointments();
      loadServices(); loadPendingAppointments();
      loadBlockedSlots(); loadWeekBlockedSlots();
    }
  }, [salonId, selectedDate]);

  const loadSalon = async () => {
    setPageLoading(true);
    try {
      const { data } = await supabase.from('salons')
        .select('id, salon_name, work_start_hour, work_end_hour')
        .eq('user_id', user!.id).single();
      if (data) {
        setSalonId(data.id);
        setSalonName(data.salon_name || 'Mi salón');
        if ((data as any).work_start_hour != null) setWorkStart((data as any).work_start_hour);
        if ((data as any).work_end_hour   != null) setWorkEnd((data as any).work_end_hour);
      }
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

  const loadWeekBlockedSlots = async () => {
    const days = getWeekDays(selectedDate);
    const from = days[0] + 'T00:00:00';
    const to   = days[6] + 'T23:59:59';
    const { data } = await supabase.from('blocked_slots').select('*')
      .eq('user_id', user!.id)
      .gte('start_time', from)
      .lte('start_time', to);
    const byDay: Record<string, BlockedSlot[]> = {};
    days.forEach(d => { byDay[d] = []; });
    (data || []).forEach(b => {
      const d = toDateStr(new Date(b.start_time));
      if (byDay[d]) byDay[d].push(b);
    });
    setWeekBlockedSlots(byDay);
  };

  const loadBlockedSlots = async () => {
    const { data } = await supabase.from('blocked_slots').select('*')
      .eq('user_id', user!.id)
      .gte('start_time', `${selectedDate}T00:00:00`)
      .lte('start_time', `${selectedDate}T23:59:59`);
    setBlockedSlots(data || []);
  };

  const createBlockedSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) return;
    setIsLoading(true);
    try {
      const start = new Date(`${selectedDate}T${blockForm.time_start}:00`);
      const end   = new Date(`${selectedDate}T${blockForm.time_end}:00`);
      if (end <= start) throw new Error('La hora de fin debe ser posterior a la de inicio');
      const { error } = await supabase.from('blocked_slots').insert({
        salon_id: salonId, user_id: user!.id,
        title: blockForm.title,
        start_time: start.toISOString(),
        end_time:   end.toISOString(),
      } as any);
      if (error) throw error;
      setShowBlockForm(false);
      loadBlockedSlots();
      toast({ title: '🚫 Tiempo bloqueado', description: `${blockForm.title} · ${blockForm.time_start}–${blockForm.time_end}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const deleteBlockedSlot = async (id: string) => {
    await supabase.from('blocked_slots').delete().eq('id', id);
    loadBlockedSlots();
    toast({ title: 'Bloqueo eliminado' });
  };

  const loadClientHistory = async (apt: Appointment) => {
    setHistoryLoading(true);
    setClientHistory([]);
    try {
      let query = supabase.from('appointments')
        .select('*, services(name, category)')
        .eq('user_id', user!.id)
        .neq('id', apt.id)
        .order('start_time', { ascending: false });

      if (apt.client_phone) {
        query = query.eq('client_phone', apt.client_phone);
      } else {
        query = query.eq('client_name', apt.client_name);
      }
      const { data } = await query;
      setClientHistory(data || []);
    } catch (e) {
      logError('SmartAppointments:loadClientHistory', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveWorkHours = async () => {
    if (!salonId) return;
    await supabase.from('salons').update({
      work_start_hour: workStart,
      work_end_hour: workEnd,
    } as any).eq('id', salonId);
    toast({ title: '✅ Horario guardado', description: `${workStart}:00 – ${workEnd}:00` });
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
        description: svcForm.description || null,
        category: svcForm.category || null,
        active: true,
        center_id: null,
      } as any);
      if (error) throw error;
      setSvcForm({ name: '', duration_minutes: 60, price: '', description: '', category: '' });
      setShowNewSvc(false);
      loadServices();
      toast({ title: '✅ Servicio añadido', description: svcForm.name });
    } catch (e) {
      logError('SmartAppointments:createService', e);
      toast({ title: 'Error', description: 'No se pudo crear el servicio.', variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const updateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSvc) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('services').update({
        name: editForm.name,
        duration_minutes: Number(editForm.duration_minutes),
        price: editForm.price ? Number(editForm.price) : null,
        description: editForm.description || null,
        category: editForm.category || null,
      } as any).eq('id', editingSvc.id);
      if (error) throw error;
      setEditingSvc(null);
      loadServices();
      toast({ title: '✅ Servicio actualizado', description: editForm.name });
    } catch (e) {
      logError('SmartAppointments:updateService', e);
      toast({ title: 'Error', description: 'No se pudo actualizar el servicio.', variant: 'destructive' });
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

  // ─── Dynamic calendar helpers ────────────────────────────────────
  const TOTAL_HOURS = workEnd - workStart;
  const isToday     = selectedDate === toDateStr(new Date());
  const nowTop = (() => {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < workStart || h > workEnd) return null;
    return (h - workStart) * HOUR_HEIGHT;
  })();

  const serviceColor = (serviceId: string | null) => {
    if (!serviceId) return PALETTES[0];
    const idx = services.findIndex(s => s.id === serviceId);
    return PALETTES[Math.max(idx, 0) % PALETTES.length];
  };

  const positions = assignColumns(appointments, workStart);

  const blockedPosition = (slot: BlockedSlot) => {
    const s  = new Date(slot.start_time);
    const e  = new Date(slot.end_time);
    const sh = s.getHours() + s.getMinutes() / 60;
    const eh = e.getHours() + e.getMinutes() / 60;
    return {
      top:    (sh - workStart) * HOUR_HEIGHT,
      height: Math.max((eh - sh) * HOUR_HEIGHT, 28),
    };
  };

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
      calendarRef.current.scrollTop = Math.max((h - workStart - 1) * HOUR_HEIGHT, 0);
    }
  }, [appointments, workStart]);

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
                            onClick={() => { updateStatus(apt.id, 'confirmed'); setSelectedDate(toDateStr(dt)); setSelectedApt(apt); loadClientHistory(apt); }}>
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
            <div className="flex-1 text-center font-medium capitalize text-sm">
              {view === 'week'
                ? `${new Date(weekDays[0]+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})} – ${new Date(weekDays[6]+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}`
                : selectedDate === today
                  ? <span className="text-primary font-bold">Hoy · {new Date(selectedDate+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                  : new Date(selectedDate+'T12:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short',year:'numeric'})
              }
            </div>
            {/* Mini cal toggle — visible on mobile */}
            <Button
              variant={showMiniCal ? 'default' : 'outline'}
              size="icon"
              className="lg:hidden"
              onClick={() => setShowMiniCal(v => !v)}
              title="Mini calendario"
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => changeDate(view === 'week' ? 7 : 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* ── Mobile mini calendar (collapsible) ── */}
          {showMiniCal && (
            <div className="lg:hidden">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <button className="text-muted-foreground hover:text-foreground p-1 rounded"
                    onClick={() => setMiniCalDate(p => { const d = new Date(p.year, p.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold capitalize">
                    {new Date(miniCalDate.year, miniCalDate.month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </span>
                  <button className="text-muted-foreground hover:text-foreground p-1 rounded"
                    onClick={() => setMiniCalDate(p => { const d = new Date(p.year, p.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {['L','M','X','J','V','S','D'].map(d => (
                    <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                  {getMonthDays(miniCalDate.year, miniCalDate.month).map((dayStr, i) => {
                    if (!dayStr) return <div key={`e${i}`} />;
                    const isSelected  = dayStr === selectedDate;
                    const isTodayD    = dayStr === today;
                    const hasApts     = (weekApts[dayStr] || []).length > 0;
                    const totalWorkMin = (workEnd - workStart) * 60;
                    const bookedMin   = (weekApts[dayStr] || [])
                      .filter(a => a.status !== 'cancelled')
                      .reduce((s, a) => s + (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000, 0);
                    const freePct     = totalWorkMin > 0 ? ((totalWorkMin - bookedMin) / totalWorkMin) * 100 : 100;
                    const dotColor    = !hasApts ? '' : freePct > 60 ? 'bg-green-400' : freePct > 30 ? 'bg-yellow-400' : 'bg-red-400';
                    return (
                      <div key={dayStr} className="flex flex-col items-center">
                        <button
                          onClick={() => { setSelectedDate(dayStr); setShowMiniCal(false); }}
                          className={`text-sm w-full aspect-square flex items-center justify-center rounded-full font-medium transition-colors
                            ${isSelected ? 'bg-primary text-white' : isTodayD ? 'text-primary border border-primary/40' : 'hover:bg-muted'}`}
                        >
                          {new Date(dayStr + 'T12:00:00').getDate()}
                        </button>
                        {hasApts && !isSelected && (
                          <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Block time form inside mobile mini cal */}
                <div className="mt-4 pt-4 border-t border-muted/40">
                  <button
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary border border-dashed border-muted-foreground/30 rounded-lg py-2.5 hover:border-primary/40 transition-colors"
                    onClick={() => setShowBlockForm(v => !v)}
                  >
                    <X className="w-4 h-4" /> Bloquear tiempo
                  </button>
                  {showBlockForm && (
                    <form onSubmit={createBlockedSlot} className="mt-3 space-y-3">
                      <div>
                        <Label className="text-xs">Título</Label>
                        <Input value={blockForm.title} onChange={e => setBlockForm({...blockForm, title: e.target.value})}
                          placeholder="Descanso" required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Desde</Label>
                          <Input type="time" value={blockForm.time_start}
                            onChange={e => setBlockForm({...blockForm, time_start: e.target.value})} required />
                        </div>
                        <div>
                          <Label className="text-xs">Hasta</Label>
                          <Input type="time" value={blockForm.time_end}
                            onChange={e => setBlockForm({...blockForm, time_end: e.target.value})} required />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : '🚫 Bloquear'}
                      </Button>
                    </form>
                  )}
                  {blockedSlots.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Bloqueados hoy</p>
                      {blockedSlots.map(slot => {
                        const fmt = (d: Date) => d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
                        return (
                          <div key={slot.id} className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-gray-700">{slot.title}</p>
                              <p className="text-xs text-gray-500">{fmt(new Date(slot.start_time))} – {fmt(new Date(slot.end_time))}</p>
                            </div>
                            <button onClick={() => deleteBlockedSlot(slot.id)} className="text-gray-400 hover:text-red-500 ml-2">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── WEEK VIEW ── */}
          {view === 'week' && (
            <Card>
              <CardContent className="p-3">
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day, i) => {
                    const dayApts    = weekApts[day] || [];
                    const dayBlocked = weekBlockedSlots[day] || [];
                    const totalWorkMin = (workEnd - workStart) * 60;

                    const bookedMin = dayApts
                      .filter(a => a.status !== 'cancelled')
                      .reduce((s, a) => s + (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000, 0);
                    const blockedMin = dayBlocked
                      .reduce((s, b) => s + (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000, 0);
                    const freeMin    = Math.max(totalWorkMin - bookedMin - blockedMin, 0);
                    const freeH      = Math.floor(freeMin / 60);
                    const freeM      = freeMin % 60;
                    const freePct    = totalWorkMin > 0 ? (freeMin / totalWorkMin) * 100 : 100;
                    const freeLabel  = freeH > 0 ? `${freeH}h${freeM > 0 ? `${freeM}m` : ''}` : freeM > 0 ? `${freeM}m` : 'lleno';

                    // Color: green >60%, yellow 30-60%, red <30%
                    const barColor   = freePct > 60 ? 'bg-green-400' : freePct > 30 ? 'bg-yellow-400' : 'bg-red-400';
                    const textColor  = freePct > 60 ? 'text-green-600' : freePct > 30 ? 'text-yellow-600' : 'text-red-500';

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

                        {/* Barra de disponibilidad */}
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isSelected ? 'bg-white/60' : barColor}`}
                            style={{ width: `${Math.min(100 - freePct, 100)}%` }}
                          />
                        </div>

                        <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {dayApts.length > 0 ? (
                            <p>{dayApts.length} cita{dayApts.length !== 1 ? 's' : ''}</p>
                          ) : null}
                          <p className={`font-medium ${isSelected ? 'text-white/90' : textColor}`}>
                            {freeLabel} libre{freeLabel !== 'lleno' ? 's' : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── DAY VIEW ── */}
          {view === 'day' && (
            <div className="flex gap-3">

              {/* ── Mini calendar sidebar (desktop only) ── */}
              <div className="hidden lg:flex flex-col gap-3 w-44 shrink-0">
                <Card className="p-3">
                  {/* Month header */}
                  <div className="flex items-center justify-between mb-2">
                    <button
                      className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                      onClick={() => setMiniCalDate(p => {
                        const d = new Date(p.year, p.month - 1, 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })}
                    ><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="text-xs font-semibold capitalize">
                      {new Date(miniCalDate.year, miniCalDate.month, 1)
                        .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                      onClick={() => setMiniCalDate(p => {
                        const d = new Date(p.year, p.month + 1, 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })}
                    ><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                  {/* Day names */}
                  <div className="grid grid-cols-7 mb-1">
                    {['L','M','X','J','V','S','D'].map(d => (
                      <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">{d}</div>
                    ))}
                  </div>
                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-y-0.5">
                    {getMonthDays(miniCalDate.year, miniCalDate.month).map((dayStr, i) => {
                      if (!dayStr) return <div key={`e${i}`} />;
                      const isSelected = dayStr === selectedDate;
                      const isTodayD   = dayStr === today;
                      const dayNum     = new Date(dayStr + 'T12:00:00').getDate();
                      const hasApts    = (weekApts[dayStr] || []).length > 0;
                      const totalWorkMin = (workEnd - workStart) * 60;
                      const bookedMin  = (weekApts[dayStr] || [])
                        .filter(a => a.status !== 'cancelled')
                        .reduce((s, a) => s + (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000, 0);
                      const freePct    = totalWorkMin > 0 ? ((totalWorkMin - bookedMin) / totalWorkMin) * 100 : 100;
                      const dotColor   = !hasApts ? '' : freePct > 60 ? 'bg-green-400' : freePct > 30 ? 'bg-yellow-400' : 'bg-red-400';
                      return (
                        <div key={dayStr} className="flex flex-col items-center">
                          <button
                            onClick={() => setSelectedDate(dayStr)}
                            className={`text-[11px] w-full aspect-square flex items-center justify-center rounded-full transition-colors font-medium
                              ${isSelected ? 'bg-primary text-white' : isTodayD ? 'text-primary border border-primary/40' : 'hover:bg-muted text-foreground'}`}
                          >{dayNum}</button>
                          {hasApts && !isSelected && (
                            <div className={`w-1 h-1 rounded-full mt-0.5 ${dotColor}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Block time button + form */}
                <Card className="p-3 space-y-2">
                  <button
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 rounded-lg py-2 hover:border-primary/40 hover:text-primary transition-colors"
                    onClick={() => { setShowBlockForm(v => !v); setShowForm(false); setSelectedApt(null); }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Bloquear tiempo
                  </button>

                  {showBlockForm && (
                    <form onSubmit={createBlockedSlot} className="space-y-2 pt-1">
                      <div>
                        <Label className="text-[10px]">Título</Label>
                        <Input
                          value={blockForm.title}
                          onChange={e => setBlockForm({...blockForm, title: e.target.value})}
                          className="h-7 text-xs"
                          placeholder="Descanso"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <Label className="text-[10px]">Desde</Label>
                          <Input type="time" value={blockForm.time_start}
                            onChange={e => setBlockForm({...blockForm, time_start: e.target.value})}
                            className="h-7 text-xs" required />
                        </div>
                        <div>
                          <Label className="text-[10px]">Hasta</Label>
                          <Input type="time" value={blockForm.time_end}
                            onChange={e => setBlockForm({...blockForm, time_end: e.target.value})}
                            className="h-7 text-xs" required />
                        </div>
                      </div>
                      <Button type="submit" size="sm" className="w-full h-7 text-xs" disabled={isLoading}>
                        {isLoading ? '...' : 'Bloquear'}
                      </Button>
                    </form>
                  )}

                  {/* Blocked slots of today */}
                  {blockedSlots.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-muted/40">
                      <p className="text-[10px] text-muted-foreground font-medium">Bloqueados hoy</p>
                      {blockedSlots.map(slot => {
                        const s = new Date(slot.start_time);
                        const e = new Date(slot.end_time);
                        const fmt = (d: Date) => d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
                        return (
                          <div key={slot.id} className="flex items-center justify-between bg-gray-100 rounded px-2 py-1">
                            <div>
                              <p className="text-[10px] font-medium text-gray-700">{slot.title}</p>
                              <p className="text-[10px] text-gray-500">{fmt(s)}–{fmt(e)}</p>
                            </div>
                            <button onClick={() => deleteBlockedSlot(slot.id)}
                              className="text-gray-400 hover:text-red-500 ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

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
                            {String(workStart + i).padStart(2, '0')}:00
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
                          const h = Math.floor(i / 2) + workStart;
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
                                setShowBlockForm(false);
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

                        {/* Blocked slots — hatched background */}
                        {blockedSlots.map(slot => {
                          const pos = blockedPosition(slot);
                          if (pos.top < 0) return null;
                          return (
                            <div
                              key={slot.id}
                              className="absolute left-0 right-0 z-5 pointer-events-none"
                              style={{ top: pos.top, height: pos.height }}
                            >
                              <div className="w-full h-full rounded-sm border border-gray-300"
                                style={{
                                  background: 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 4px, #f3f4f6 4px, #f3f4f6 12px)',
                                  opacity: 0.85,
                                }}
                              />
                              <div className="absolute inset-0 flex items-center px-2 pointer-events-auto">
                                <span className="text-xs font-medium text-gray-500 truncate">{slot.title}</span>
                                <button onClick={() => deleteBlockedSlot(slot.id)}
                                  className="ml-auto text-gray-400 hover:text-red-500 shrink-0">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
                          const colW   = `${100 / pos.totalCols}%`;
                          const colL   = `${(apt.service_id ? pos.col : 0) / pos.totalCols * 100}%`;
                          const isSelected = selectedApt?.id === apt.id;
                          const startFmt   = new Date(apt.start_time).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
                          const endFmt     = new Date(apt.end_time).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});

                          // ── Status-based colors ──
                          const statusStyle =
                            apt.status === 'pending'   ? 'bg-amber-100 border-l-amber-500 text-amber-900' :
                            apt.status === 'confirmed' ? 'bg-green-100 border-l-green-500 text-green-900' :
                            apt.status === 'completed' ? 'bg-gray-100 border-l-gray-400 text-gray-500' :
                            apt.status === 'no_show'   ? 'bg-yellow-50 border-l-yellow-400 text-yellow-800' :
                            apt.status === 'cancelled' ? 'bg-red-50 border-l-red-300 text-red-400 opacity-50' :
                            /* scheduled */ 'bg-blue-100 border-l-blue-500 text-blue-900';

                          return (
                            <div
                              key={apt.id}
                              className={`absolute rounded-lg border-l-4 px-2 py-1 cursor-pointer overflow-hidden transition-all z-10 select-none
                                ${statusStyle}
                                ${apt.status === 'pending' ? 'animate-pulse' : ''}
                                ${isSelected ? 'ring-2 ring-primary ring-offset-1 shadow-lg' : 'hover:shadow-md hover:z-20'}`}
                              style={{
                                top:    pos.top + 2,
                                height: pos.height - 4,
                                left:   `calc(${colL} + 2px)`,
                                width:  `calc(${colW} - 4px)`,
                              }}
                              onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); setShowForm(false); setShowBlockForm(false); loadClientHistory(apt); }}
                            >
                              <p className="font-semibold text-xs leading-tight truncate">
                                {isPending && '⏳ '}
                                <span className="opacity-70">{startFmt}–{endFmt} </span>
                                {apt.client_name}
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

                            {/* ── Historial de la clienta ── */}
                            <div className="border-t border-muted/40 pt-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5" /> Historial de la clienta
                              </p>
                              {historyLoading ? (
                                <p className="text-xs text-muted-foreground">Cargando...</p>
                              ) : clientHistory.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">Primera visita 🎉</p>
                              ) : (() => {
                                // Stats
                                const past = clientHistory.filter(h => h.status !== 'cancelled' && h.status !== 'no_show');
                                const total = past.length;

                                // Most used services
                                const svcCount: Record<string, { name: string; count: number }> = {};
                                past.forEach(h => {
                                  const svcName = (h as any).services?.name;
                                  if (!svcName) return;
                                  if (!svcCount[svcName]) svcCount[svcName] = { name: svcName, count: 0 };
                                  svcCount[svcName].count++;
                                });
                                const topSvcs = Object.values(svcCount).sort((a, b) => b.count - a.count).slice(0, 3);

                                // Visit frequency
                                const dates = past.map(h => new Date(h.start_time).getTime()).sort((a, b) => a - b);
                                let avgDays: number | null = null;
                                if (dates.length >= 2) {
                                  const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / 86400000);
                                  avgDays = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
                                }

                                // Last visit
                                const lastVisit = past[0] ? new Date(past[0].start_time) : null;

                                // Notes
                                const notes = clientHistory.filter(h => h.notes).slice(0, 3);

                                return (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="bg-primary/5 rounded-lg p-2 text-center">
                                        <p className="text-lg font-bold text-primary">{total}</p>
                                        <p className="text-[10px] text-muted-foreground">visita{total !== 1 ? 's' : ''}</p>
                                      </div>
                                      <div className="bg-primary/5 rounded-lg p-2 text-center">
                                        <p className="text-lg font-bold text-primary">
                                          {avgDays !== null ? `~${avgDays}d` : '—'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">cadencia</p>
                                      </div>
                                    </div>

                                    {lastVisit && (
                                      <p className="text-xs text-muted-foreground">
                                        🕐 Última visita: <span className="font-medium text-foreground">
                                          {lastVisit.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}
                                        </span>
                                      </p>
                                    )}

                                    {topSvcs.length > 0 && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground font-medium mb-1">💅 Servicios más frecuentes</p>
                                        <div className="space-y-1">
                                          {topSvcs.map(s => (
                                            <div key={s.name} className="flex items-center justify-between">
                                              <span className="text-xs truncate">{s.name}</span>
                                              <span className="text-xs font-semibold text-primary ml-2 shrink-0">×{s.count}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {notes.length > 0 && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground font-medium mb-1">📝 Notas anteriores</p>
                                        <div className="space-y-1">
                                          {notes.map(h => (
                                            <div key={h.id} className="bg-muted/40 rounded p-1.5">
                                              <p className="text-[10px] text-muted-foreground">
                                                {new Date(h.start_time).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
                                              </p>
                                              <p className="text-xs">{h.notes}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

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
                        <div className="col-span-2">
                          <Label className="text-xs">Categoría</Label>
                          <Select value={svcForm.category} onValueChange={v => setSvcForm({...svcForm, category: v})}>
                            <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                            <SelectContent>
                              {SERVICE_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                    editingSvc?.id === svc.id ? (
                      /* ── INLINE EDIT FORM ── */
                      <div key={svc.id} className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                        <p className="text-xs font-semibold text-primary mb-3">✏️ Editando: {svc.name}</p>
                        <form onSubmit={updateService} className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <Label className="text-xs">Nombre *</Label>
                              <Input value={editForm.name}
                                onChange={e => setEditForm({...editForm, name: e.target.value})} required />
                            </div>
                            <div>
                              <Label className="text-xs">Duración (min) *</Label>
                              <Input type="number" min={5} value={editForm.duration_minutes}
                                onChange={e => setEditForm({...editForm, duration_minutes: Number(e.target.value)})} required />
                            </div>
                            <div>
                              <Label className="text-xs">Precio (€)</Label>
                              <Input type="number" min={0} step="0.01" placeholder="Ej: 30" value={editForm.price}
                                onChange={e => setEditForm({...editForm, price: e.target.value})} />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Categoría</Label>
                              <Select value={editForm.category} onValueChange={v => setEditForm({...editForm, category: v})}>
                                <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                                <SelectContent>
                                  {SERVICE_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={isLoading}>
                              {isLoading ? 'Guardando...' : '✓ Guardar cambios'}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => setEditingSvc(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      /* ── SERVICE ROW ── */
                      <div key={svc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${PALETTES[i % PALETTES.length].border.replace('border-l-','bg-')}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{svc.name}</p>
                              {svc.category && (
                                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                  {svc.category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(svc.duration_minutes)}{svc.price ? ` · €${svc.price}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setEditingSvc(svc);
                              setEditForm({
                                name: svc.name,
                                duration_minutes: svc.duration_minutes,
                                price: svc.price?.toString() || '',
                                description: svc.description || '',
                                category: svc.category || '',
                              });
                              setShowNewSvc(false);
                            }}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteService(svc.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    {services.length} servicio{services.length!==1?'s':''} activo{services.length!==1?'s':''}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          {/* ── Working hours settings ── */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4" /> Horario laboral
              </CardTitle>
              <p className="text-sm text-muted-foreground">El calendario solo mostrará este rango de horas</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label className="text-xs">Apertura</Label>
                  <Select value={String(workStart)} onValueChange={v => setWorkStart(Number(v))}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 17}, (_, i) => i + 6).map(h => (
                        <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Cierre</Label>
                  <Select value={String(workEnd)} onValueChange={v => setWorkEnd(Number(v))}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 17}, (_, i) => i + 6).map(h => (
                        <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveWorkHours} className="bg-gradient-primary text-white">
                  Guardar horario
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Horario actual: <strong>{String(workStart).padStart(2,'0')}:00 – {String(workEnd).padStart(2,'0')}:00</strong>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartAppointments;
