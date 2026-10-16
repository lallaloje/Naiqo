import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Plus, Edit3, Trash2, Phone, Mail, Clock,
  Calendar, TrendingUp, X, CheckCircle, XCircle,
  Star, Scissors, ChevronLeft, Award, BarChart2,
} from "lucide-react";
import { logError } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────
interface Break {
  start_hour: number;
  end_hour: number;
  label: string;
}

interface DaySchedule {
  start: number;
  end: number;
}

interface Employee {
  id: string;
  salon_id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  color: string;
  active: boolean;
  working_days: number[];
  work_start_hour: number;
  work_end_hour: number;
  day_schedules: Record<string, DaySchedule>;
  breaks: Break[];
  notes: string | null;
  created_at: string;
}

interface EmpStats {
  totalApts: number;
  monthApts: number;
  totalRevenue: number;
  monthRevenue: number;
  completionRate: number;
  topServices: { name: string; count: number }[];
  avgPerWeek: number;
  recentApts: any[];
  noShows: number;
}

// ─── Constants ────────────────────────────────────────────────────
const ROLES: Record<string, string> = {
  nail_tech:    '💅 Técnica de uñas',
  receptionist: '📋 Recepcionista',
  manager:      '👑 Encargada',
  other:        '👤 Otro',
};

const COLORS = [
  '#e879a0','#a855f7','#3b82f6','#10b981',
  '#f59e0b','#ef4444','#06b6d4','#f97316',
  '#84cc16','#6366f1','#ec4899','#14b8a6',
];

const DAY_LABELS  = ['L','M','X','J','V','S','D'];
const DAY_NAMES   = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const HOURS       = Array.from({ length: 17 }, (_, i) => i + 6); // 6-22

const DEFAULT_START = 10;
const DEFAULT_END   = 21;

const EMPTY_FORM = {
  name: '', email: '', phone: '', role: 'nail_tech',
  color: '#e879a0', working_days: [1,2,3,4,5] as number[],
  work_start_hour: DEFAULT_START, work_end_hour: DEFAULT_END,
  day_schedules: { 1: { start: DEFAULT_START, end: DEFAULT_END }, 2: { start: DEFAULT_START, end: DEFAULT_END }, 3: { start: DEFAULT_START, end: DEFAULT_END }, 4: { start: DEFAULT_START, end: DEFAULT_END }, 5: { start: DEFAULT_START, end: DEFAULT_END } } as Record<string, DaySchedule>,
  notes: '',
  breaks: [] as Break[],
};

// ─── Helpers ─────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('');
}

function fmtEur(n: number) { return `€${n.toFixed(0)}`; }

// ─── Component ───────────────────────────────────────────────────
const EmployeesSection: React.FC = () => {
  const [employees,    setEmployees]    = useState<Employee[]>([]);
  const [salonId,      setSalonId]      = useState<string | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [pageLoading,  setPageLoading]  = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editingEmp,   setEditingEmp]   = useState<Employee | null>(null);
  const [selectedEmp,  setSelectedEmp]  = useState<Employee | null>(null);
  const [empStats,     setEmpStats]     = useState<EmpStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);

  const { user }  = useAuth();
  const { toast } = useToast();

  // ── Load ────────────────────────────────────────────────────────
  useEffect(() => { if (user) loadSalonAndEmployees(); }, [user]);

  const loadSalonAndEmployees = async () => {
    setPageLoading(true);
    try {
      const { data: salon } = await supabase.from('salons')
        .select('id').eq('user_id', user!.id).single();
      if (salon) {
        setSalonId(salon.id);
        await loadEmployees(salon.id);
      }
    } catch (e) { logError('EmployeesSection:loadSalon', e); }
    finally { setPageLoading(false); }
  };

  const loadEmployees = async (sid?: string) => {
    const id = sid || salonId;
    if (!id) return;
    const { data } = await supabase.from('employees')
      .select('*').eq('user_id', user!.id).order('name');
    setEmployees(data || []);
  };

  // ── Stats ───────────────────────────────────────────────────────
  const loadEmpStats = async (emp: Employee) => {
    setStatsLoading(true);
    setEmpStats(null);
    try {
      const { data: apts } = await supabase.from('appointments')
        .select('*, services(name)')
        .eq('user_id', user!.id)
        .eq('employee_id', emp.id)
        .order('start_time', { ascending: false });

      const all  = apts || [];
      const done = all.filter(a => !['cancelled','no_show'].includes(a.status));
      const now  = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthApts = done.filter(a => a.start_time >= monthStart);

      // Revenue
      const totalRevenue = done.reduce((s, a) => s + ((a as any).services?.price || 0), 0);
      const monthRevenue = monthApts.reduce((s, a) => s + ((a as any).services?.price || 0), 0);

      // Top services
      const svcMap: Record<string, number> = {};
      done.forEach(a => {
        const n = (a as any).services?.name;
        if (n) svcMap[n] = (svcMap[n] || 0) + 1;
      });
      const topServices = Object.entries(svcMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([name, count]) => ({ name, count }));

      // Completion rate
      const finished = all.filter(a => ['completed','confirmed','scheduled'].includes(a.status)).length;
      const completionRate = all.length > 0 ? Math.round((finished / all.length) * 100) : 100;

      // No shows
      const noShows = all.filter(a => a.status === 'no_show').length;

      // Avg per week
      let avgPerWeek = 0;
      if (done.length >= 2) {
        const dates = done.map(a => new Date(a.start_time).getTime()).sort((a,b) => a-b);
        const weeks = (dates[dates.length-1] - dates[0]) / (7 * 86400000) || 1;
        avgPerWeek = Math.round((done.length / weeks) * 10) / 10;
      }

      setEmpStats({
        totalApts: done.length,
        monthApts: monthApts.length,
        totalRevenue,
        monthRevenue,
        completionRate,
        topServices,
        avgPerWeek,
        recentApts: all.slice(0, 8),
        noShows,
      });
    } catch (e) {
      logError('EmployeesSection:loadStats', e);
    } finally {
      setStatsLoading(false);
    }
  };

  // ── CRUD ────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingEmp(null);
    setShowForm(true);
    setSelectedEmp(null);
  };

  const openEdit = (emp: Employee) => {
    // Build day_schedules: use existing or fall back to global hours for each working day
    const ds: Record<string, DaySchedule> = {};
    (emp.working_days || [1,2,3,4,5]).forEach(d => {
      ds[String(d)] = (emp.day_schedules || {})[String(d)] || { start: emp.work_start_hour, end: emp.work_end_hour };
    });
    setForm({
      name: emp.name, email: emp.email || '', phone: emp.phone || '',
      role: emp.role, color: emp.color, working_days: emp.working_days || [1,2,3,4,5],
      work_start_hour: emp.work_start_hour, work_end_hour: emp.work_end_hour,
      day_schedules: ds,
      notes: emp.notes || '',
      breaks: emp.breaks || [],
    });
    setEditingEmp(emp);
    setShowForm(true);
    setSelectedEmp(null);
  };

  const saveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) return;
    setIsLoading(true);
    try {
      // Derive global work hours from the first working day for backward compat
      const firstDay = form.working_days[0];
      const firstSched = firstDay ? (form.day_schedules[String(firstDay)] || { start: DEFAULT_START, end: DEFAULT_END }) : { start: DEFAULT_START, end: DEFAULT_END };
      const payload = {
        salon_id: salonId, user_id: user!.id,
        name: form.name, email: form.email || null, phone: form.phone || null,
        role: form.role, color: form.color,
        working_days: form.working_days,
        work_start_hour: firstSched.start, work_end_hour: firstSched.end,
        day_schedules: form.day_schedules,
        breaks: form.breaks,
        notes: form.notes || null, active: true,
      };
      if (editingEmp) {
        const { error } = await supabase.from('employees').update(payload as any).eq('id', editingEmp.id);
        if (error) throw error;
        toast({ title: '✅ Empleada actualizada', description: form.name });
      } else {
        const { error } = await supabase.from('employees').insert(payload as any);
        if (error) throw error;
        toast({ title: '✅ Empleada añadida', description: form.name });
      }
      setShowForm(false);
      setEditingEmp(null);
      await loadEmployees();
    } catch (err: any) {
      logError('EmployeesSection:save', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const toggleActive = async (emp: Employee) => {
    await supabase.from('employees').update({ active: !emp.active } as any).eq('id', emp.id);
    await loadEmployees();
    toast({ title: emp.active ? '⏸ Empleada desactivada' : '▶ Empleada activada', description: emp.name });
  };

  const deleteEmployee = async (emp: Employee) => {
    if (!confirm(`¿Eliminar a ${emp.name}? Esta acción no se puede deshacer.`)) return;
    await supabase.from('employees').delete().eq('id', emp.id);
    setSelectedEmp(null);
    await loadEmployees();
    toast({ title: 'Empleada eliminada', description: emp.name });
  };

  const toggleDay = (day: number) => {
    setForm(f => {
      const has = f.working_days.includes(day);
      const newDays = has ? f.working_days.filter(d => d !== day) : [...f.working_days, day].sort();
      const newDs = { ...f.day_schedules };
      if (has) {
        delete newDs[String(day)];
      } else {
        newDs[String(day)] = { start: DEFAULT_START, end: DEFAULT_END };
      }
      return { ...f, working_days: newDays, day_schedules: newDs };
    });
  };

  // ── Derived stats for summary header ────────────────────────────
  const activeCount  = employees.filter(e => e.active).length;
  const totalCount   = employees.length;

  // ── Render ───────────────────────────────────────────────────────
  if (!user) return null;
  if (pageLoading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <p className="text-muted-foreground">Cargando equipo...</p>
    </div>
  );

  // ── Detail panel ─────────────────────────────────────────────────
  if (selectedEmp) {
    const emp = selectedEmp;
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => setSelectedEmp(null)} className="gap-1 -ml-2">
          <ChevronLeft className="w-4 h-4" /> Volver al equipo
        </Button>

        {/* Profile header */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-lg"
                style={{ background: emp.color }}>
                {initials(emp.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold">{emp.name}</h2>
                    <p className="text-sm text-muted-foreground">{ROLES[emp.role] || emp.role}</p>
                  </div>
                  <Badge className={emp.active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500'}>
                    {emp.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {emp.phone && (
                    <a href={`tel:${emp.phone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                      <Phone className="w-3.5 h-3.5" />{emp.phone}
                    </a>
                  )}
                  {emp.email && (
                    <a href={`mailto:${emp.email}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                      <Mail className="w-3.5 h-3.5" />{emp.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Horario */}
            <div className="mt-4 pt-4 border-t border-muted/40">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Horario de trabajo
              </p>
              <div className="space-y-1">
                {(emp.working_days || []).map(day => {
                  const ds = (emp.day_schedules || {})[String(day)];
                  const start = ds ? ds.start : emp.work_start_hour;
                  const end   = ds ? ds.end   : emp.work_end_hour;
                  return (
                    <div key={day} className="flex items-center gap-2 text-sm">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold text-white shrink-0"
                        style={{ background: emp.color }}>{DAY_LABELS[day - 1]}</span>
                      <span className="text-muted-foreground">
                        {String(start).padStart(2,'0')}:00 – {String(end).padStart(2,'0')}:00
                      </span>
                    </div>
                  );
                })}
              </div>
              {(emp.breaks || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(emp.breaks || []).map((b, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      ☕ {b.label} {String(b.start_hour).padStart(2,'0')}:00–{String(b.end_hour).padStart(2,'0')}:00
                    </span>
                  ))}
                </div>
              )}
            </div>

            {emp.notes && (
              <div className="mt-3 bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">📝 Notas</p>
                <p className="text-sm">{emp.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => openEdit(emp)} className="gap-1">
                <Edit3 className="w-3.5 h-3.5" /> Editar
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggleActive(emp)}
                className={emp.active ? 'text-orange-600 border-orange-200' : 'text-green-600 border-green-200'}>
                {emp.active ? <><XCircle className="w-3.5 h-3.5 mr-1" />Desactivar</> : <><CheckCircle className="w-3.5 h-3.5 mr-1" />Activar</>}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => deleteEmployee(emp)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {statsLoading ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Cargando estadísticas...</CardContent></Card>
        ) : empStats ? (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Citas este mes', value: empStats.monthApts, icon: '📅', color: 'text-blue-600' },
                { label: 'Total citas',    value: empStats.totalApts,  icon: '🗓', color: 'text-purple-600' },
                { label: 'Ingresos mes',   value: fmtEur(empStats.monthRevenue), icon: '💰', color: 'text-green-600' },
                { label: 'Ingresos total', value: fmtEur(empStats.totalRevenue), icon: '💎', color: 'text-primary' },
              ].map(kpi => (
                <Card key={kpi.label}>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl mb-0.5">{kpi.icon}</p>
                    <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{kpi.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Performance */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" /> Rendimiento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Tasa de completadas</span>
                    <span className="font-semibold">{empStats.completionRate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${empStats.completionRate}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">⚡ Media/semana</span>
                  <span className="font-semibold">{empStats.avgPerWeek} citas</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">🚫 No shows</span>
                  <span className="font-semibold">{empStats.noShows}</span>
                </div>
              </CardContent>
            </Card>

            {/* Top services */}
            {empStats.topServices.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Scissors className="w-4 h-4" /> Servicios más realizados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {empStats.topServices.map((s, i) => {
                    const maxCount = empStats.topServices[0].count;
                    const pct = Math.round((s.count / maxCount) * 100);
                    return (
                      <div key={s.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium truncate">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '} {s.name}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">×{s.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: emp.color }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Recent appointments */}
            {empStats.recentApts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Últimas citas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {empStats.recentApts.map(apt => {
                    const dt = new Date(apt.start_time);
                    const statusColors: Record<string, string> = {
                      completed: 'bg-gray-100 text-gray-600',
                      confirmed: 'bg-green-100 text-green-700',
                      scheduled: 'bg-blue-100 text-blue-700',
                      cancelled: 'bg-red-100 text-red-600',
                      no_show:   'bg-yellow-100 text-yellow-700',
                      pending:   'bg-amber-100 text-amber-700',
                    };
                    const statusLabels: Record<string, string> = {
                      completed: 'Completada', confirmed: 'Confirmada',
                      scheduled: 'Programada', cancelled: 'Cancelada',
                      no_show: 'No asistió', pending: 'Pendiente',
                    };
                    return (
                      <div key={apt.id} className="flex items-center justify-between py-1.5 border-b border-muted/30 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{apt.client_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {dt.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})} · {dt.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
                          </p>
                          {(apt as any).services?.name && (
                            <p className="text-xs text-muted-foreground">{(apt as any).services.name}</p>
                          )}
                        </div>
                        <Badge className={`text-[10px] border ${statusColors[apt.status] || 'bg-gray-100 text-gray-600'}`}>
                          {statusLabels[apt.status] || apt.status}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {empStats.totalApts === 0 && (
              <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">
                Sin citas asignadas todavía. Asigna empleadas al crear citas.
              </CardContent></Card>
            )}
          </>
        ) : null}
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingEmp(null); }} className="-ml-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <h2 className="text-lg font-bold">{editingEmp ? `Editar: ${editingEmp.name}` : 'Nueva empleada'}</h2>
        </div>

        <Card>
          <CardContent className="pt-5">
            <form onSubmit={saveEmployee} className="space-y-4">

              {/* Color avatar preview */}
              <div className="flex justify-center mb-2">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                  style={{ background: form.color }}>
                  {form.name ? initials(form.name) : '?'}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <Label className="text-xs">Color identificativo</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({...f, color: c}))}
                      className="w-8 h-8 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: form.color === c ? '#1a1a1a' : 'transparent' }} />
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <Label className="text-xs">Nombre completo *</Label>
                <Input placeholder="Ej: María García" value={form.name}
                  onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              </div>

              {/* Role */}
              <div>
                <Label className="text-xs">Rol</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({...f, role: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLES).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Teléfono</Label>
                  <Input placeholder="+34 600 000 000" value={form.phone}
                    onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" placeholder="maria@email.com" value={form.email}
                    onChange={e => setForm(f => ({...f, email: e.target.value}))} />
                </div>
              </div>

              {/* Working days */}
              <div>
                <Label className="text-xs">Días laborables</Label>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {DAY_LABELS.map((d, i) => {
                    const dayNum = i + 1;
                    const active = form.working_days.includes(dayNum);
                    return (
                      <button key={i} type="button" onClick={() => toggleDay(dayNum)}
                        className="w-9 h-9 rounded-full text-sm font-semibold border-2 transition-all"
                        style={{
                          background:   active ? form.color : 'transparent',
                          borderColor:  active ? form.color : '#e5e7eb',
                          color:        active ? '#fff' : '#6b7280',
                        }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Per-day working hours */}
              {form.working_days.length > 0 && (
                <div>
                  <Label className="text-xs mb-2 block">Horario por día</Label>
                  <div className="space-y-2">
                    {form.working_days.map(day => {
                      const sched = form.day_schedules[String(day)] || { start: DEFAULT_START, end: DEFAULT_END };
                      return (
                        <div key={day} className="flex items-center gap-2">
                          <span className="text-xs font-medium w-20 shrink-0">{DAY_NAMES[day - 1]}</span>
                          <Select value={String(sched.start)} onValueChange={v => setForm(f => ({
                            ...f, day_schedules: { ...f.day_schedules, [String(day)]: { ...sched, start: Number(v) } }
                          }))}>
                            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {HOURS.map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}:00</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <span className="text-xs text-muted-foreground">–</span>
                          <Select value={String(sched.end)} onValueChange={v => setForm(f => ({
                            ...f, day_schedules: { ...f.day_schedules, [String(day)]: { ...sched, end: Number(v) } }
                          }))}>
                            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {HOURS.map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}:00</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Breaks */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">Descansos</Label>
                  <Button type="button" size="sm" variant="outline" className="h-6 text-xs px-2 gap-1"
                    onClick={() => setForm(f => ({ ...f, breaks: [...f.breaks, { start_hour: 14, end_hour: 15, label: 'Comida' }] }))}>
                    <Plus className="w-3 h-3" /> Añadir descanso
                  </Button>
                </div>
                {form.breaks.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin descansos configurados</p>
                )}
                {form.breaks.map((brk, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2 bg-muted/40 rounded-lg p-2">
                    <Input
                      className="h-7 text-xs w-24"
                      placeholder="Etiqueta"
                      value={brk.label}
                      onChange={e => setForm(f => {
                        const b = [...f.breaks];
                        b[idx] = { ...b[idx], label: e.target.value };
                        return { ...f, breaks: b };
                      })}
                    />
                    <Select value={String(brk.start_hour)} onValueChange={v => setForm(f => {
                      const b = [...f.breaks]; b[idx] = { ...b[idx], start_hour: Number(v) }; return { ...f, breaks: b };
                    })}>
                      <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HOURS.map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}:00</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">–</span>
                    <Select value={String(brk.end_hour)} onValueChange={v => setForm(f => {
                      const b = [...f.breaks]; b[idx] = { ...b[idx], end_hour: Number(v) }; return { ...f, breaks: b };
                    })}>
                      <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HOURS.map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}:00</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive ml-auto"
                      onClick={() => setForm(f => ({ ...f, breaks: f.breaks.filter((_, i) => i !== idx) }))}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs">Notas internas</Label>
                <Textarea rows={2} placeholder="Especialidades, observaciones..."
                  value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white" disabled={isLoading}>
                  {isLoading ? 'Guardando...' : editingEmp ? '✓ Guardar cambios' : '✓ Añadir empleada'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingEmp(null); }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main list ────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Equipo
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} activa{activeCount !== 1 ? 's' : ''} · {totalCount} en total
          </p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white gap-1">
          <Plus className="w-4 h-4" /> Añadir empleada
        </Button>
      </div>

      {/* Empty state */}
      {employees.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-lg font-semibold mb-1">Aún no tienes empleadas</p>
            <p className="text-sm text-muted-foreground mb-6">
              Añade a tu equipo para asignar citas, ver estadísticas y gestionar horarios
            </p>
            <Button onClick={openCreate} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Añadir primera empleada
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Employee cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {employees.map(emp => (
          <Card key={emp.id}
            className={`cursor-pointer hover:shadow-md transition-all ${!emp.active ? 'opacity-60' : ''}`}
            onClick={() => { setSelectedEmp(emp); loadEmpStats(emp); }}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow"
                  style={{ background: emp.color }}>
                  {initials(emp.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="font-semibold leading-tight">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{ROLES[emp.role] || emp.role}</p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${emp.active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400'}`}>
                      {emp.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>

                  {/* Contact */}
                  <div className="flex flex-wrap gap-x-3 mt-1.5">
                    {emp.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />{emp.phone}
                      </span>
                    )}
                    {emp.email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" />{emp.email}
                      </span>
                    )}
                  </div>

                  {/* Working days */}
                  <div className="flex gap-0.5 mt-2 flex-wrap">
                    {DAY_LABELS.map((d, i) => {
                      const day = i + 1;
                      const active = (emp.working_days || []).includes(day);
                      const ds = active ? ((emp.day_schedules || {})[String(day)]) : null;
                      const hours = ds ? `${String(ds.start).padStart(2,'0')}-${String(ds.end).padStart(2,'0')}h` : null;
                      return (
                        <span key={i} title={hours || undefined}
                          className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-semibold"
                          style={{ background: active ? emp.color : '#f3f4f6', color: active ? '#fff' : '#9ca3af' }}>
                          {d}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-muted/30">
                <Button size="sm" variant="ghost" className="flex-1 text-xs h-7 gap-1"
                  onClick={e => { e.stopPropagation(); openEdit(emp); }}>
                  <Edit3 className="w-3 h-3" /> Editar
                </Button>
                <Button size="sm" variant="ghost"
                  className={`flex-1 text-xs h-7 gap-1 ${emp.active ? 'text-orange-500 hover:text-orange-600' : 'text-green-600 hover:text-green-700'}`}
                  onClick={e => { e.stopPropagation(); toggleActive(emp); }}>
                  {emp.active ? <><XCircle className="w-3 h-3" />Desactivar</> : <><CheckCircle className="w-3 h-3" />Activar</>}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-destructive"
                  onClick={e => { e.stopPropagation(); deleteEmployee(emp); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {employees.length > 0 && (
        <p className="text-xs text-center text-muted-foreground pt-2">
          Pulsa sobre una empleada para ver sus estadísticas completas
        </p>
      )}
    </div>
  );
};

export default EmployeesSection;
