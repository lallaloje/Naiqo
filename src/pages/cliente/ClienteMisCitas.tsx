import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar, Clock, Scissors, ArrowLeft, Search, X, Pencil, ChevronLeft, Gift } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type DaySchedules = Record<string, { start: number; end: number }>;

interface Cita {
  id: string;
  client_name: string;
  client_email: string | null;
  start_time: string;
  end_time: string;
  status: string;
  salons: { salon_name: string; id: string; user_id: string; day_schedules: DaySchedules | null } | null;
  services: { name: string; price: number | null; duration_minutes: number } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending:   '⏳ Pendiente',
  scheduled: 'Programada',
  confirmed: '✅ Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};
const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-orange-100 text-orange-700 border-orange-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200',
};

function generateSlots(
  date: Date,
  durationMin: number,
  busyApts: { start_time: string; end_time: string }[],
  daySchedules: DaySchedules,
): string[] {
  const slots: string[] = [];
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const sched = daySchedules[String(date.getDay())];
  if (!sched) return [];

  for (let h = sched.start; h < sched.end; h++) {
    for (let m = 0; m < 60; m += 30) {
      const slotStart = new Date(date);
      slotStart.setHours(h, m, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);
      if (isToday && slotStart <= now) continue;
      const endMin = slotEnd.getHours() * 60 + slotEnd.getMinutes();
      if (endMin > sched.end * 60) continue;
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

const ClienteMisCitas = () => {
  const [email, setEmail] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'phone'>('phone');
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Estado para modificar cita
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState<Date | undefined>(undefined);
  const [reschedSlots, setReschedSlots] = useState<string[]>([]);
  const [reschedSlot, setReschedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const buscarCitas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    setLoading(true);
    const val = inputEmail.trim();

    if (searchType === 'email') {
      const { data } = await supabase
        .from('appointments')
        .select('*, salons(salon_name, id, user_id, day_schedules), services(name, price, duration_minutes)')
        .ilike('client_email' as any, val)
        .order('start_time', { ascending: false });
      setCitas((data as any) || []);
    } else {
      // Usar RPC con SECURITY DEFINER para saltarse la RLS en búsqueda por teléfono
      const { data } = await supabase.rpc('get_appointments_by_phone', { p_phone: val });
      const mapped = (data || []).map((r: any) => ({
        id:           r.id,
        client_name:  r.client_name,
        client_email: r.client_email,
        client_phone: r.client_phone,
        start_time:   r.start_time,
        end_time:     r.end_time,
        status:       r.status,
        salon_id:     r.salon_id,
        service_id:   r.service_id,
        salons: r.salon_id ? {
          salon_name:   r.salon_name,
          id:           r.salon_id,
          user_id:      r.salon_user_id,
          day_schedules: r.salon_day_schedules,
        } : null,
        services: r.service_id ? {
          name:               r.service_name,
          price:              r.service_price,
          duration_minutes:   r.service_duration_minutes,
        } : null,
      }));
      setCitas(mapped);
    }

    setEmail(val.toLowerCase());
    setLoading(false);
  };

  const handleCancel = async (citaId: string) => {
    if (!window.confirm('¿Seguro que quieres cancelar esta cita?')) return;
    setCancelling(citaId);
    try {
      let cancelled = false;
      if (searchType === 'email') {
        const { data, error } = await supabase.rpc('cancel_appointment_by_client', {
          p_appointment_id: citaId,
          p_client_email: email,
        });
        if (error) throw error;
        cancelled = !!data;
      } else {
        // Para búsquedas por teléfono usamos cancelación directa por id y phone
        const { data, error } = await supabase.rpc('cancel_appointment_by_phone', {
          p_appointment_id: citaId,
          p_client_phone: email,
        });
        if (error) throw error;
        cancelled = !!data;
      }
      if (!cancelled) throw new Error('No se pudo cancelar. La cita puede que ya haya pasado o esté completada.');
      setCitas(prev => prev.map(c => c.id === citaId ? { ...c, status: 'cancelled' } : c));
      toast({ title: '✅ Cita cancelada', description: 'Tu cita ha sido cancelada correctamente.' });
    } catch (err: any) {
      toast({ title: 'Error al cancelar', description: err.message || 'Inténtalo de nuevo.', variant: 'destructive' });
    }
    setCancelling(null);
  };

  const openReschedule = (citaId: string) => {
    setReschedulingId(citaId);
    setReschedDate(undefined);
    setReschedSlots([]);
    setReschedSlot(null);
  };

  const handleReschedDate = async (date: Date | undefined) => {
    setReschedDate(date);
    setReschedSlot(null);
    if (!date || !reschedulingId) return;

    const cita = citas.find(c => c.id === reschedulingId);
    if (!cita?.salons?.day_schedules || !cita.services) return;

    setLoadingSlots(true);
    const dateStr = date.toISOString().split('T')[0];
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const { data: busy } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('salon_id' as any, cita.salons.id)
      .neq('id', reschedulingId) // excluir la cita actual
      .gte('start_time', `${dateStr}T00:00:00`)
      .lt('start_time', nextDay.toISOString().split('T')[0] + 'T00:00:00')
      .not('status', 'in', '("cancelled")');

    const slots = generateSlots(
      date,
      cita.services.duration_minutes,
      (busy as any) || [],
      cita.salons.day_schedules,
    );
    setReschedSlots(slots);
    setLoadingSlots(false);
  };

  const handleReschedSave = async () => {
    if (!reschedulingId || !reschedDate || !reschedSlot) return;
    const cita = citas.find(c => c.id === reschedulingId);
    if (!cita?.services) return;

    setSaving(true);
    const [hh, mm] = reschedSlot.split(':').map(Number);
    const newStart = new Date(reschedDate);
    newStart.setHours(hh, mm, 0, 0);
    const newEnd = new Date(newStart.getTime() + cita.services.duration_minutes * 60000);

    const { error } = await supabase
      .from('appointments')
      .update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        status: 'scheduled',
      } as any)
      .eq('id', reschedulingId)
      .ilike('client_email' as any, email);

    if (error) {
      toast({ title: 'Error al modificar', description: error.message, variant: 'destructive' });
    } else {
      setCitas(prev => prev.map(c =>
        c.id === reschedulingId
          ? { ...c, start_time: newStart.toISOString(), end_time: newEnd.toISOString(), status: 'scheduled' }
          : c
      ));
      toast({ title: '✅ Cita modificada', description: `Nueva cita el ${newStart.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${reschedSlot}.` });

      const fechaStr = newStart.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

      // Notificar al salón por push
      if (cita.salons?.user_id) {
        supabase.functions.invoke('send-push', {
          body: {
            user_id: cita.salons.user_id,
            title: '📅 Cita modificada',
            body: `${cita.client_name} ha cambiado su cita de ${cita.services?.name || 'servicio'} al ${fechaStr} a las ${reschedSlot}.`,
            url: '/gestion-citas',
          },
        });
      }

      // Notificar a la clienta por WhatsApp
      if (cita.client_email) {
        // Buscar teléfono de la clienta por email en appointments
        const { data: aptData } = await supabase
          .from('appointments')
          .select('client_phone')
          .ilike('client_email' as any, cita.client_email)
          .not('client_phone' as any, 'is', null)
          .limit(1)
          .single();
        const phone = (aptData as any)?.client_phone;
        if (phone) {
          supabase.functions.invoke('send-whatsapp', {
            body: {
              type: 'cita_modificada',
              to: phone,
              clientName:  cita.client_name,
              serviceName: cita.services?.name || '',
              salonName:   cita.salons?.salon_name || '',
              date: fechaStr,
              time: reschedSlot,
            },
          });
        }
      }

      setReschedulingId(null);
    }
    setSaving(false);
  };

  const proximas = citas.filter(c =>
    new Date(c.start_time) >= new Date() && c.status !== 'cancelled'
  );
  const pasadas = citas.filter(c =>
    new Date(c.start_time) < new Date() || c.status === 'cancelled'
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/cliente')} className="text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Mis citas</h1>
        </div>
        <p className="text-pink-100 text-sm ml-8">Consulta y gestiona tus reservas</p>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <form onSubmit={buscarCitas} className="space-y-3">
              <Label className="text-sm font-medium">Busca tus citas</Label>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setSearchType('phone'); setInputEmail(''); }}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${searchType === 'phone' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}
                >
                  📱 Teléfono
                </button>
                <button
                  type="button"
                  onClick={() => { setSearchType('email'); setInputEmail(''); }}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${searchType === 'email' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}
                >
                  ✉️ Email
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  type={searchType === 'email' ? 'email' : 'tel'}
                  placeholder={searchType === 'email' ? 'tu@email.com' : '612 345 678'}
                  value={inputEmail}
                  onChange={e => setInputEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0"
                  disabled={loading}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {email && !loading && (
          <>
            {citas.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No encontramos citas</p>
                <p className="text-gray-400 text-sm mt-1">para {email}</p>
              </div>
            ) : (
              <>
                {proximas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Próximas · {proximas.length}
                    </p>
                    <div className="space-y-3">
                      {proximas.map(cita => (
                        <div key={cita.id}>
                          <CitaCard
                            cita={cita}
                            onReservar={() => navigate(`/reservar/${cita.salons?.id || ''}`)}
                            onCancel={() => handleCancel(cita.id)}
                            onModificar={() => reschedulingId === cita.id ? setReschedulingId(null) : openReschedule(cita.id)}
                            cancelling={cancelling === cita.id}
                            isRescheduling={reschedulingId === cita.id}
                          />
                          {reschedulingId === cita.id && (
                            <ReschedulePanel
                              cita={cita}
                              date={reschedDate}
                              slots={reschedSlots}
                              selectedSlot={reschedSlot}
                              loadingSlots={loadingSlots}
                              saving={saving}
                              onDateChange={handleReschedDate}
                              onSlotSelect={setReschedSlot}
                              onSave={handleReschedSave}
                              onClose={() => setReschedulingId(null)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pasadas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">
                      Historial · {pasadas.length}
                    </p>
                    <div className="space-y-3 opacity-70">
                      {pasadas.map(cita => <CitaCard key={cita.id} cita={cita} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        )}

        <Card className="border-dashed border-pink-200 bg-pink-50/50 border-0 shadow-none">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-sm text-gray-600 mb-3">¿Quieres pedir una nueva cita?</p>
            <Button
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0"
              onClick={() => navigate('/cliente')}
            >
              <Search className="w-4 h-4 mr-2" />
              Buscar salones
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-around max-w-lg mx-auto">
        <button className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate('/cliente')}>
          <Search className="w-5 h-5" />
          <span className="text-xs">Explorar</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-primary">
          <Calendar className="w-5 h-5" />
          <span className="text-xs font-medium">Mis citas</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate('/cliente/mis-sellos')}>
          <Gift className="w-5 h-5" />
          <span className="text-xs">Mis sellos</span>
        </button>
      </div>

      <div className="h-20" />
    </div>
  );
};

// ── Tarjeta de cita ────────────────────────────────────────────────────────
const CitaCard = ({
  cita,
  onReservar,
  onCancel,
  onModificar,
  cancelling,
  isRescheduling,
}: {
  cita: Cita;
  onReservar?: () => void;
  onCancel?: () => void;
  onModificar?: () => void;
  cancelling?: boolean;
  isRescheduling?: boolean;
}) => {
  const dt = new Date(cita.start_time);
  const isFuture = new Date(cita.start_time) > new Date();
  const canCancel = isFuture && cita.status !== 'cancelled' && cita.status !== 'completed';

  return (
    <Card className={`border-0 shadow-sm ${isRescheduling ? 'ring-2 ring-purple-400' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <Badge className={`text-xs border ${STATUS_COLOR[cita.status] || STATUS_COLOR.scheduled}`}>
              {STATUS_LABEL[cita.status] || cita.status}
            </Badge>
            <p className="font-semibold text-gray-900">
              {cita.salons?.salon_name || 'Salón'}
            </p>
            {cita.services && (
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                {cita.services.name}
                {cita.services.price ? ` · €${cita.services.price}` : ''}
              </p>
            )}
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {canCancel && onModificar && (
              <Button
                size="sm"
                variant="outline"
                className={`text-xs h-8 ${isRescheduling ? 'border-purple-400 text-purple-600 bg-purple-50' : 'border-purple-200 text-purple-600 hover:bg-purple-50'}`}
                onClick={onModificar}
              >
                <Pencil className="w-3 h-3 mr-1" />
                {isRescheduling ? 'Cerrar' : 'Modificar'}
              </Button>
            )}
            {canCancel && onCancel && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 border-red-200 text-red-500 hover:bg-red-50"
                onClick={onCancel}
                disabled={cancelling}
              >
                {cancelling ? '…' : <><X className="w-3 h-3 mr-1" />Cancelar</>}
              </Button>
            )}
            {onReservar && !canCancel && (
              <Button size="sm" variant="outline" className="text-xs h-8 border-pink-200 text-pink-600" onClick={onReservar}>
                Repetir
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Panel de reprogramación ────────────────────────────────────────────────
const ReschedulePanel = ({
  cita,
  date,
  slots,
  selectedSlot,
  loadingSlots,
  saving,
  onDateChange,
  onSlotSelect,
  onSave,
  onClose,
}: {
  cita: Cita;
  date: Date | undefined;
  slots: string[];
  selectedSlot: string | null;
  loadingSlots: boolean;
  saving: boolean;
  onDateChange: (d: Date | undefined) => void;
  onSlotSelect: (s: string) => void;
  onSave: () => void;
  onClose: () => void;
}) => {
  const daySchedules = cita.salons?.day_schedules || {};

  const isDisabled = (d: Date) => {
    const dow = String(d.getDay());
    return !daySchedules[dow];
  };

  return (
    <Card className="border-0 shadow-md mt-2 overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm text-gray-800">Elige nueva fecha y hora</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-center">
          <CalendarComponent
            mode="single"
            selected={date}
            onSelect={onDateChange}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0)) || isDisabled(d)}
            className="rounded-xl border shadow-none"
          />
        </div>

        {date && (
          <div>
            <p className="text-xs text-gray-500 mb-2">
              Horas disponibles el {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}:
            </p>
            {loadingSlots ? (
              <div className="flex gap-2 flex-wrap">
                {[1,2,3,4].map(i => <div key={i} className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">No hay horas disponibles este día</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map(s => (
                  <button
                    key={s}
                    onClick={() => onSlotSelect(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      selectedSlot === s
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedSlot && (
          <Button
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Guardando…' : `Confirmar nueva cita a las ${selectedSlot}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ClienteMisCitas;
