import { useState, useEffect } from 'react';
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
import { CheckCircle, Clock, Phone, MapPin, ChevronLeft, ChevronRight, Scissors } from "lucide-react";

interface Salon {
  id: string;
  salon_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  user_id: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
}

interface SlimApt {
  start_time: string;
  end_time: string;
}

// ── Genera franjas horarias libres ─────────────────────────────────
function generateSlots(date: Date, durationMin: number, busyApts: SlimApt[]): string[] {
  const slots: string[] = [];
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  for (let h = 9; h < 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      const slotStart = new Date(date);
      slotStart.setHours(h, m, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);

      // No mostrar horas pasadas hoy
      if (isToday && slotStart <= now) continue;
      // No mostrar si pasa de 21:00
      if (slotEnd.getHours() > 21 || (slotEnd.getHours() === 21 && slotEnd.getMinutes() > 0)) continue;

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
  return slots;
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
  const [step, setStep]               = useState<1 | 2 | 3>(1); // 1=service, 2=datetime, 3=datos
  const [isLoading, setIsLoading]     = useState(false);
  const [done, setDone]               = useState(false);
  const [notFound, setNotFound]       = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    client_name: '', client_email: '', client_phone: '', notes: ''
  });

  // ── Cargar salón ────────────────────────────────────────────────
  useEffect(() => {
    if (!salonId) return;
    const load = async () => {
      const { data } = await supabase.from('salons').select('id,salon_name,phone,address,city,user_id')
        .eq('id', salonId).single();
      if (data) setSalon(data as Salon);
      else setNotFound(true);
    };
    load();
  }, [salonId]);

  // ── Cargar servicios ────────────────────────────────────────────
  useEffect(() => {
    if (!salon) return;
    const load = async () => {
      const { data } = await supabase.from('services').select('id,name,description,duration_minutes,price')
        .eq('salon_id', salonId).eq('active', true).order('name');
      setServices((data as Service[]) || []);
    };
    load();
  }, [salon]);

  // ── Cargar citas ocupadas cuando cambia fecha o servicio ────────
  useEffect(() => {
    if (!salonId || !selectedService) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const load = async () => {
      const { data } = await supabase.from('appointments').select('start_time,end_time')
        .eq('salon_id', salonId)
        .gte('start_time', `${dateStr}T00:00:00`)
        .lte('start_time', `${dateStr}T23:59:59`)
        .neq('status', 'cancelled');
      setBusyApts((data as SlimApt[]) || []);
    };
    load();
  }, [selectedDate, selectedService, salonId]);

  // ── Recalcular franjas cuando cambia busy o servicio ───────────
  useEffect(() => {
    if (!selectedService) return;
    const s = generateSlots(selectedDate, selectedService.duration_minutes, busyApts);
    setSlots(s);
    setSelectedSlot('');
  }, [busyApts, selectedService, selectedDate]);

  // ── Confirmar reserva con pago Stripe ──────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot || !salon) return;
    setIsLoading(true);

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const start   = new Date(`${dateStr}T${selectedSlot}:00`);
      const end     = new Date(start.getTime() + selectedService.duration_minutes * 60000);

      // Si el servicio tiene precio → cobrar señal via Stripe
      if (selectedService.price && selectedService.price > 0) {
        const { data, error } = await supabase.functions.invoke('create-booking-checkout', {
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
          }
        });
        if (error || !data?.url) throw new Error(data?.error || 'Error al crear el pago');
        // Redirigir a Stripe Checkout
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
        status:       'pending',
        source:       'online',
        notes:        form.notes || null,
      } as any);
      if (error) throw error;
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
              <div>
                <h1 className="text-xl font-bold">{salonDisplayName}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                  {salon.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{salon.address}{salon.city ? `, ${salon.city}` : ''}</span>}
                  {salon.phone  && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{salon.phone}</span>}
                </div>
              </div>
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
              ) : (
                services.map(svc => (
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
                ))
              )}
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
                disabled={date => date < new Date(new Date().setHours(0,0,0,0))}
                className="rounded-xl border w-full"
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
                <div>
                  <Label>Nombre completo *</Label>
                  <Input placeholder="Ana García" value={form.client_name}
                    onChange={e => setForm({...form, client_name: e.target.value})} required />
                </div>
                <div>
                  <Label>Teléfono (WhatsApp) *</Label>
                  <Input type="tel" placeholder="+34 600 000 000" value={form.client_phone}
                    onChange={e => setForm({...form, client_phone: e.target.value})} required />
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
                  {isLoading ? 'Redirigiendo al pago...' :
                    selectedService?.price
                      ? `💳 Pagar señal €${(selectedService.price * 0.5).toFixed(2)} y confirmar cita`
                      : '✅ Solicitar cita'}
                </Button>
                {selectedService?.price && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                    <p className="font-semibold">ℹ️ Política de señal</p>
                    <p>Se te cobra el <strong>50% ahora (€{(selectedService.price * 0.5).toFixed(2)})</strong> para reservar el hueco.</p>
                    <p>Los <strong>€{(selectedService.price * 0.5).toFixed(2)} restantes</strong> los pagas en el salón el día de la cita.</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  Pago seguro con Stripe 🔒
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
