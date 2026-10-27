import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CheckCircle, Clock, Phone, ChevronLeft, ChevronRight, Scissors, CalendarDays } from "lucide-react";

type DaySchedules = Record<string, { start: number; end: number }>;

interface Salon {
  id: string;
  salon_name: string | null;
  phone: string | null;
  user_id: string;
  day_schedules: DaySchedules | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  category: string | null;
}

interface SlimApt {
  start_time: string;
  end_time: string;
}

// ── Genera franjas horarias libres usando el horario real del salón ────
function generateSlots(date: Date, durationMin: number, busyApts: SlimApt[], daySchedules: DaySchedules): string[] {
  const slots: string[] = [];
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const dow = date.getDay(); // 0=Dom … 6=Sáb
  const sched = daySchedules[String(dow)];
  if (!sched) return []; // día no laborable
  const ranges: Array<[number, number]> = [[sched.start, sched.end]];

  for (const [rangeStart, rangeEnd] of ranges) {
    for (let h = rangeStart; h < rangeEnd; h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotStart = new Date(date);
        slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);

        // No mostrar horas pasadas hoy
        if (isToday && slotStart <= now) continue;
        // La cita completa debe caber dentro del rango
        const endTotalMin = slotEnd.getHours() * 60 + slotEnd.getMinutes();
        if (endTotalMin > rangeEnd * 60) continue;

        // Comprobar conflictos con citas existentes
        const conflict = busyApts.some(apt => {
          const as_ = new Date(apt.start_time).getTime();
          const ae  = new Date(apt.end_time).getTime();
          return slotStart.getTime() < ae && slotEnd.getTime() > as_;
        });

        if (!conflict) {
          slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
      }
    }
  }
  return slots;
}

// Obtiene el offset real de Europe/Madrid para una fecha dada (respeta cambio de hora)
function getSpainOffset(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  const tz = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', timeZoneName: 'longOffset' })
    .formatToParts(d)
    .find(p => p.type === 'timeZoneName')?.value ?? 'GMT+02:00';
  return tz.replace('GMT', '');
}

const PublicBooking = () => {
  const { centerId: salonId } = useParams<{ centerId: string }>();
  const [salon, setSalon]             = useState<Salon | null>(null);
  const [services, setServices]       = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [busyApts, setBusyApts]       = useState<SlimApt[]>([]);
  const [slots, setSlots]             = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [step, setStep]               = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading]     = useState(false);
  const [done, setDone]               = useState(false);
  const [notFound, setNotFound]       = useState(false);
  const [disabledDates, setDisabledDates] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const [form, setForm] = useState({
    client_name: '', client_email: '', client_phone: '', notes: ''
  });
  const [clientSuggestions, setClientSuggestions] = useState<Array<{name:string;phone:string;email:string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const phoneSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sobreescribir manifest PWA con URL real (para que iOS la lea correctamente) ──
  useEffect(() => {
    if (!salonId) return;

    // Apuntar al manifest dinámico real (no blob URL — iOS no lee blob URLs para PWA)
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) link.href = `/api/manifest/${salonId}`;

    // Meta tags para iOS
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
      el.href = href;
    };
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-status-bar-style', 'default');
    setMeta('apple-mobile-web-app-title', 'Reservas');
    setLink('apple-touch-icon', '/NAIQO_Logo_Magenta_Transparent.png');
  }, [salonId]);

  // Actualizar nombre en el manifest cuando llegan los datos del salón
  // Actualizar título Apple con nombre del salón cuando llegan los datos
  useEffect(() => {
    if (!salon?.salon_name) return;
    const el = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (el) el.content = salon.salon_name;
  }, [salon?.salon_name]);

  // ── Guardar slug en localStorage para redirección cuando la clienta abre la PWA ──
  useEffect(() => {
    if (salonId) localStorage.setItem('naiqo_client_booking', salonId);
  }, [salonId]);

  // ── Cargar salón (via RPC para evitar RLS) ─────────────────────
  useEffect(() => {
    if (!salonId) return;
    let loaded = false;
    const load = async () => {
      const { data, error } = await supabase.rpc('get_salon_for_booking', { p_salon_id: salonId });
      if (error || !data || data.length === 0) { setNotFound(true); return; }
      loaded = true;
      setSalon(data[0] as Salon);
    };
    load();
    const t = setTimeout(() => { if (!loaded) setNotFound(true); }, 8000);
    return () => clearTimeout(t);
  }, [salonId]);

  // ── Cargar servicios (via RPC) ──────────────────────────────────
  useEffect(() => {
    if (!salon) return;
    const load = async () => {
      const { data } = await supabase.rpc('get_services_for_booking', { p_salon_id: salonId });
      setServices((data as Service[]) || []);
    };
    load();
  }, [salon]);

  // ── Cargar citas ocupadas (via RPC) ────────────────────────────
  useEffect(() => {
    if (!salonId || !selectedService) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth()+1)}-${pad(selectedDate.getDate())}`;
    const load = async () => {
      const { data } = await supabase.rpc('get_busy_slots', { p_salon_id: salonId, p_date: dateStr });
      setBusyApts((data as SlimApt[]) || []);
    };
    load();
  }, [selectedDate, selectedService, salonId]);

  // ── Recalcular franjas cuando cambia busy o servicio ───────────
  useEffect(() => {
    if (!selectedService || !salon) return;
    const s = generateSlots(selectedDate, selectedService.duration_minutes, busyApts, salon.day_schedules || {});
    setSlots(s);
    setSelectedSlot('');
    // Marcar día como completo si es laborable pero no tiene huecos
    if (s.length === 0) {
      const dow = selectedDate.getDay();
      const hasSched = !!(salon.day_schedules || {})[String(dow)];
      if (hasSched) {
        const pad = (n: number) => String(n).padStart(2, '0');
        const key = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth()+1)}-${pad(selectedDate.getDate())}`;
        setDisabledDates(prev => new Set([...prev, key]));
      }
    }
  }, [busyApts, selectedService, selectedDate, salon]);

  // ── Buscar cliente por teléfono al escribir ────────────────────
  const handlePhoneChange = (phone: string) => {
    setForm(f => ({ ...f, client_phone: phone }));
    if (phoneSearchTimeout.current) clearTimeout(phoneSearchTimeout.current);
    if (phone.replace(/\D/g,'').length < 6) { setClientSuggestions([]); return; }
    phoneSearchTimeout.current = setTimeout(async () => {
      const { data } = await supabase.rpc('lookup_client_by_phone', { p_salon_id: salonId, p_phone: phone });
      if (data && data.length > 0) { setClientSuggestions(data as any[]); setShowSuggestions(true); }
      else setClientSuggestions([]);
    }, 400);
  };

  const applySuggestion = (c: { name: string; phone: string; email: string }) => {
    setForm(f => ({ ...f, client_name: c.name, client_phone: c.phone, client_email: c.email || '' }));
    setShowSuggestions(false);
  };

  // ── Confirmar reserva con pago Stripe ──────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot || !salon) return;
    setIsLoading(true);

    try {
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${selectedDate.getFullYear()}-${pad2(selectedDate.getMonth()+1)}-${pad2(selectedDate.getDate())}`;
      const offset = getSpainOffset(selectedDate);
      const start  = new Date(`${dateStr}T${selectedSlot}:00${offset}`);
      const end    = new Date(start.getTime() + selectedService.duration_minutes * 60000);

      // Hora local española (para pasar a las Edge Functions sin depender de Intl en Deno)
      const localDate = selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const localTime = selectedSlot;

      // Si el servicio tiene precio → guardar tarjeta via Stripe (sin cobro)
      if (selectedService.price && selectedService.price > 0) {
        const { data, error } = await supabase.functions.invoke('create-setup-checkout', {
          body: {
            salonId,
            userId:       salon.user_id,
            serviceId:    selectedService.id,
            serviceName:  selectedService.name,
            servicePrice: selectedService.price,
            clientName:   form.client_name,
            clientEmail:  form.client_email,
            clientPhone:  form.client_phone,
            startTime:    start.toISOString(),
            endTime:      end.toISOString(),
            notes:        form.notes,
            origin:       window.location.origin,
            localDate,
            localTime,
          }
        });
        if (error || !data?.url) throw new Error(data?.error || 'Error al procesar la reserva');
        // Redirigir a Stripe para guardar la tarjeta
        window.location.href = data.url;
        return;
      }

      // Si no tiene precio → crear cita directamente (sin pago)
      const { error } = await supabase.from('appointments').insert({
        salon_id:     salonId,
        user_id:      salon.user_id,
        service_id:   selectedService.id,
        client_name:  form.client_name,
        client_email: form.client_email || null,
        client_phone: form.client_phone || null,
        start_time:   start.toISOString(),
        end_time:     end.toISOString(),
        status:       'confirmed',
        source:       'online',
        notes:        form.notes || null,
      } as any);
      if (error) throw error;

      // Send confirmation email (non-blocking)
      if (form.client_email) {
        supabase.functions.invoke('send-booking-confirmation', {
          body: {
            clientName:      form.client_name,
            clientEmail:     form.client_email,
            salonName:       salon.salon_name || salonDisplayName,
            salonPhone:      salon.phone || null,
            serviceName:     selectedService.name,
            startTime:       start.toISOString(),
            localDate,
            localTime,
            durationMinutes: selectedService.duration_minutes,
          },
        }).catch(console.error);
      }

      // Send push notification to salon owner (non-blocking)
      const date = localDate;
      const time = localTime;
      supabase.functions.invoke('send-push', {
        body: {
          user_id: salon.user_id,
          title:   '💅 Nueva reserva online',
          body:    `${form.client_name} · ${selectedService.name} · ${date} a las ${time}`,
          url:     '/gestion-citas',
        },
      }).catch(console.error);

      // WhatsApp a la clienta: cita confirmada directamente
      if (form.client_phone) {
        supabase.functions.invoke('send-whatsapp', {
          body: {
            type:        'cita_confirmada',
            to:          form.client_phone,
            clientName:  form.client_name,
            serviceName: selectedService.name,
            salonName:   salon.salon_name || salonDisplayName,
            date,
            time,
          },
        }).catch(console.error);
      }

      setDone(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'No se pudo crear la cita.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Pantalla: no encontrado ─────────────────────────────────────
  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-pink-50 to-purple-50">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8">
          <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="font-semibold text-lg mb-2">Salón no encontrado</p>
          <p className="text-muted-foreground text-sm">Este enlace de reservas no es válido.</p>
        </CardContent>
      </Card>
    </div>
  );

  // ── Pantalla: cargando ──────────────────────────────────────────
  if (!salon) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  );

  // ── Pantalla: reserva completada ────────────────────────────────
  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-pink-50 to-purple-50">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">¡Cita solicitada! 🎉</h2>
            <p className="text-muted-foreground text-sm">
              {salon.salon_name} confirmará tu cita en breve.
            </p>
          </div>
          <div className="bg-muted rounded-lg p-4 text-left space-y-2 text-sm">
            <p><strong>Salón:</strong> {salon.salon_name}</p>
            <p><strong>Servicio:</strong> {selectedService?.name}</p>
            <p><strong>Fecha:</strong> {selectedDate.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
            <p><strong>Hora:</strong> {selectedSlot}</p>
            <p><strong>Nombre:</strong> {form.client_name}</p>
          </div>
          {salon.phone && (
            <p className="text-sm text-muted-foreground">
              Si necesitas cambiar la cita, escríbenos al{' '}
              <a href={`tel:${salon.phone}`} className="text-primary font-medium">{salon.phone}</a>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const salonDisplayName = salon.salon_name || 'Tu salón de uñas';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Header del salón */}
        <Card className="bg-white/80 backdrop-blur">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
                {salonDisplayName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">{salonDisplayName}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                  {salon.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{salon.phone}</span>}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 flex items-center gap-1.5 text-xs"
                onClick={() => window.location.href = `/cliente/mis-citas?salon=${salonId}`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Mis citas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pasos */}
        <div className="flex items-center gap-2 text-sm">
          {(['1. Servicio', '2. Fecha y hora', '3. Tus datos'] as const).map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${step === i+1 ? 'bg-primary text-white' : step > i+1 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span className={step === i+1 ? 'font-medium text-foreground' : 'text-muted-foreground hidden sm:inline'}>
                {label.split('. ')[1]}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-muted" />}
            </div>
          ))}
        </div>

        {/* ── PASO 1: Elegir servicio ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Qué servicio quieres?</CardTitle>
              <CardDescription>Elige el servicio que te interesa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {services.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">Este salón aún no tiene servicios publicados.</p>
              ) : (() => {
                const cats = Array.from(new Set(services.map(s => s.category || 'Otros')));
                return cats.map(cat => (
                  <div key={cat} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">{cat}</p>
                    {services.filter(s => (s.category || 'Otros') === cat).map(svc => (
                      <div
                        key={svc.id}
                        onClick={() => { setSelectedService(svc); setStep(2); }}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md
                          ${selectedService?.id === svc.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/40'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{svc.name}</p>
                            {svc.description && <p className="text-sm text-muted-foreground mt-0.5">{svc.description}</p>}
                            <Badge variant="outline" className="mt-2 text-xs">
                              <Clock className="w-3 h-3 mr-1" />{svc.duration_minutes} min
                            </Badge>
                          </div>
                          {svc.price && (
                            <p className="font-bold text-lg text-primary shrink-0 ml-4">€{svc.price}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </CardContent>
          </Card>
        )}

        {/* ── PASO 2: Fecha y hora ── */}
        {step === 2 && selectedService && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg">Elige fecha y hora</CardTitle>
                  <CardDescription>{selectedService.name} · {selectedService.duration_minutes} min</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={date => { if (date) { setSelectedDate(date); setSelectedSlot(''); } }}
                disabled={(date: Date) => {
                  if (date < new Date(new Date().setHours(0,0,0,0))) return true;
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const key = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
                  return disabledDates.has(key);
                }}
                className="rounded-xl border w-full"
                weekStartsOn={1}
              />

              <div>
                <p className="font-medium mb-3 text-sm">Horarios disponibles</p>
                {slots.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4 bg-muted rounded-lg">
                    No hay horarios disponibles para este día. Prueba con otro día.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <Button
                        key={slot}
                        type="button"
                        size="sm"
                        variant={selectedSlot === slot ? 'default' : 'outline'}
                        onClick={() => setSelectedSlot(slot)}
                        className="text-sm"
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                disabled={!selectedSlot}
                onClick={() => setStep(3)}
              >
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── PASO 3: Datos del cliente ── */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg">Tus datos</CardTitle>
                  <CardDescription>
                    {selectedService?.name} · {selectedDate.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})} · {selectedSlot}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Label>Teléfono (WhatsApp) *</Label>
                  <Input type="tel" placeholder="+34 600 000 000" value={form.client_phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    required />
                  {showSuggestions && clientSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                      {clientSuggestions.map((c, i) => (
                        <button key={i} type="button" onMouseDown={() => applySuggestion(c)}
                          className="w-full text-left px-4 py-2 hover:bg-primary/10 text-sm first:rounded-t-lg last:rounded-b-lg">
                          <span className="font-medium">{c.name}</span>
                          {c.email && <span className="text-muted-foreground ml-2 text-xs">{c.email}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Nombre completo *</Label>
                  <Input placeholder="Ana García" value={form.client_name}
                    onChange={e => setForm({...form, client_name: e.target.value})} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="ana@email.com" value={form.client_email}
                    onChange={e => setForm({...form, client_email: e.target.value})} />
                </div>
                <div>
                  <Label>Notas (opcional)</Label>
                  <Textarea placeholder="¿Algo que debamos saber? Color preferido, alergias..." rows={2}
                    value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>

                {/* Resumen */}
                <div className="bg-muted rounded-xl p-4 space-y-1.5 text-sm">
                  <p className="font-semibold mb-2">Resumen de tu cita</p>
                  <p>💅 {selectedService?.name}</p>
                  <p>📅 {selectedDate.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</p>
                  <p>🕐 {selectedSlot} ({selectedService?.duration_minutes} min)</p>
                  {selectedService?.price && <p>💰 €{selectedService.price}</p>}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? 'Preparando reserva...' :
                    selectedService?.price
                      ? '💳 Guardar tarjeta y confirmar cita (gratis)'
                      : '✅ Solicitar cita'}
                </Button>
                {selectedService?.price && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                    <p className="font-semibold">ℹ️ Política de cancelación</p>
                    <p>La reserva es <strong>completamente gratuita</strong>. Solo guardamos tu tarjeta para proteger el hueco.</p>
                    <p>Si cancelas <strong>con menos de 24 h de antelación</strong> o no acudes, se cobrará el <strong>50% del servicio (€{(selectedService.price * 0.5).toFixed(2)})</strong>.</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  Validación segura con Stripe 🔒 — no se realiza ningún cargo ahora
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Reservas gestionadas por <span className="font-semibold">NAIQO</span>
        </p>
      </div>
    </div>
  );
};

export default PublicBooking;
