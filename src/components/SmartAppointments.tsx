import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertCircle
} from "lucide-react";
import { logError } from '@/lib/logger';

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
  created_at: string;
}

interface Service {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  active: boolean;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const DEFAULT_SERVICES = [
  { name: 'Manicura clásica', duration_minutes: 45, price: 20 },
  { name: 'Manicura semipermanente', duration_minutes: 60, price: 30 },
  { name: 'Uñas de gel', duration_minutes: 90, price: 45 },
  { name: 'Uñas acrílicas', duration_minutes: 120, price: 55 },
  { name: 'Pedicura', duration_minutes: 60, price: 35 },
  { name: 'Nail art', duration_minutes: 30, price: 15 },
  { name: 'Tratamiento de hidratación', duration_minutes: 30, price: 20 },
  { name: 'Extensiones de uñas', duration_minutes: 120, price: 60 },
];

const SmartAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const [newAppointment, setNewAppointment] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    service_id: '',
    appointment_time: '',
    notes: '',
  });

  const [newService, setNewService] = useState({
    name: '',
    duration_minutes: 60,
    price: '',
    description: '',
  });

  // Load salon on mount
  useEffect(() => {
    if (user) loadSalon();
  }, [user]);

  // Reload appointments when salonId or date changes
  useEffect(() => {
    if (salonId) {
      loadAppointments();
      loadServices();
    }
  }, [salonId, selectedDate]);

  const loadSalon = async () => {
    setPageLoading(true);
    try {
      const { data, error } = await supabase
        .from('salons')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (error || !data) {
        logError('SmartAppointments:loadSalon', error);
        return;
      }
      setSalonId(data.id);
    } catch (error) {
      logError('SmartAppointments:loadSalon', error);
    } finally {
      setPageLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('salon_id', salonId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      logError('SmartAppointments:loadAppointments', error);
    }
  };

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('salon_id', salonId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      logError('SmartAppointments:loadServices', error);
    }
  };

  const createAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) return;
    setIsLoading(true);

    try {
      const selectedService = services.find(s => s.id === newAppointment.service_id);
      const durationMinutes = selectedService?.duration_minutes || 60;

      const startTime = new Date(`${selectedDate}T${newAppointment.appointment_time}:00`);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      const { error } = await supabase.from('appointments').insert({
        salon_id: salonId,
        service_id: newAppointment.service_id || null,
        client_name: newAppointment.client_name,
        client_email: newAppointment.client_email || null,
        client_phone: newAppointment.client_phone || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        notes: newAppointment.notes || null,
      });

      if (error) throw error;

      setNewAppointment({ client_name: '', client_email: '', client_phone: '', service_id: '', appointment_time: '', notes: '' });
      setShowNewAppointment(false);
      loadAppointments();
      toast({ title: '✅ Cita creada', description: 'La cita se ha añadido a tu agenda.' });
    } catch (error) {
      logError('SmartAppointments:createAppointment', error);
      toast({ title: 'Error', description: 'No se pudo crear la cita.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      loadAppointments();
      toast({ title: 'Estado actualizado', description: `Cita marcada como: ${STATUS_LABELS[status]}` });
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta cita?')) return;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (!error) {
      loadAppointments();
      toast({ title: 'Cita eliminada' });
    }
  };

  const createService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) return;
    setIsLoading(true);

    try {
      const { error } = await supabase.from('services').insert({
        salon_id: salonId,
        name: newService.name,
        duration_minutes: Number(newService.duration_minutes),
        price: newService.price ? Number(newService.price) : null,
        description: newService.description || null,
        active: true,
      });

      if (error) throw error;

      setNewService({ name: '', duration_minutes: 60, price: '', description: '' });
      setShowNewService(false);
      loadServices();
      toast({ title: '✅ Servicio añadido', description: `"${newService.name}" ya está disponible en tus citas.` });
    } catch (error) {
      logError('SmartAppointments:createService', error);
      toast({ title: 'Error', description: 'No se pudo crear el servicio.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const addDefaultServices = async () => {
    if (!salonId) return;
    setIsLoading(true);
    try {
      const rows = DEFAULT_SERVICES.map(s => ({ ...s, salon_id: salonId, active: true }));
      const { error } = await supabase.from('services').insert(rows);
      if (error) throw error;
      loadServices();
      toast({ title: '✅ Servicios añadidos', description: 'Se han añadido 8 servicios predeterminados.' });
    } catch (error) {
      logError('SmartAppointments:addDefaultServices', error);
      toast({ title: 'Error', description: 'No se pudieron añadir los servicios.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (!error) {
      loadServices();
      toast({ title: 'Servicio eliminado' });
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDateLabel = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (selectedDate === today) return 'Hoy';
    if (selectedDate === tomorrow) return 'Mañana';
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Gestión de Citas</CardTitle>
            <CardDescription>Inicia sesión para gestionar tu agenda</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/auth'}>Iniciar Sesión</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">Cargando agenda...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CalendarIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Tu Agenda</h1>
        </div>
        <p className="text-muted-foreground">Gestiona tus citas y servicios fácilmente</p>
      </div>

      {/* Booking link */}
      <BookingLinkCard />

      <Tabs defaultValue="agenda">
        <TabsList className="grid w-full grid-cols-2 max-w-sm mx-auto">
          <TabsTrigger value="agenda">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Agenda
          </TabsTrigger>
          <TabsTrigger value="servicios">
            <Scissors className="w-4 h-4 mr-2" />
            Servicios
          </TabsTrigger>
        </TabsList>

        {/* ── AGENDA TAB ── */}
        <TabsContent value="agenda" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Date navigator */}
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-center min-w-[160px]">
                    <p className="font-semibold text-lg capitalize">{formatDateLabel()}</p>
                    <p className="text-sm text-muted-foreground">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto hidden md:block"
                  />
                </div>
                <Button
                  onClick={() => setShowNewAppointment(!showNewAppointment)}
                  className="bg-gradient-primary text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Cita
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {/* New appointment form */}
              {showNewAppointment && (
                <Card className="mb-6 border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Nueva Cita — {formatDateLabel()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={createAppointment} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="client_name">Nombre del cliente *</Label>
                          <Input
                            id="client_name"
                            placeholder="Ej: Ana García"
                            value={newAppointment.client_name}
                            onChange={(e) => setNewAppointment({ ...newAppointment, client_name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="appointment_time">Hora *</Label>
                          <Input
                            id="appointment_time"
                            type="time"
                            value={newAppointment.appointment_time}
                            onChange={(e) => setNewAppointment({ ...newAppointment, appointment_time: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="client_phone">Teléfono</Label>
                          <Input
                            id="client_phone"
                            placeholder="+34 600 000 000"
                            value={newAppointment.client_phone}
                            onChange={(e) => setNewAppointment({ ...newAppointment, client_phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="client_email">Email</Label>
                          <Input
                            id="client_email"
                            type="email"
                            placeholder="cliente@email.com"
                            value={newAppointment.client_email}
                            onChange={(e) => setNewAppointment({ ...newAppointment, client_email: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="service_id">Servicio</Label>
                          {services.length === 0 ? (
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              No tienes servicios creados. Ve a la pestaña "Servicios" para añadirlos.
                            </p>
                          ) : (
                            <Select
                              value={newAppointment.service_id}
                              onValueChange={(value) => setNewAppointment({ ...newAppointment, service_id: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar servicio (opcional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {services.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name} — {service.duration_minutes} min
                                    {service.price ? ` — €${service.price}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="notes">Notas</Label>
                          <Textarea
                            id="notes"
                            placeholder="Notas sobre la cita o la clienta..."
                            value={newAppointment.notes}
                            onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                            rows={2}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Guardando...' : 'Guardar cita'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowNewAppointment(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Appointments list */}
              <div className="space-y-3">
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">Sin citas para este día</p>
                    <p className="text-sm text-muted-foreground mt-1">Pulsa "Nueva Cita" para añadir una</p>
                  </div>
                ) : (
                  appointments.map((apt) => {
                    const service = services.find(s => s.id === apt.service_id);
                    const startTime = new Date(apt.start_time);
                    const endTime = new Date(apt.end_time);
                    const durationMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

                    return (
                      <Card key={apt.id} className="border-l-4 border-l-primary/60 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-semibold text-base truncate">{apt.client_name}</h3>
                                <Badge className={`text-xs border ${STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled}`}>
                                  {STATUS_LABELS[apt.status] || apt.status}
                                </Badge>
                                {service && (
                                  <Badge variant="outline" className="text-xs">{service.name}</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  {' – '}
                                  {endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  {' '}({durationMin} min)
                                </span>
                                {apt.client_phone && (
                                  <a href={`tel:${apt.client_phone}`} className="flex items-center gap-1 hover:text-primary">
                                    <Phone className="w-3.5 h-3.5" />
                                    {apt.client_phone}
                                  </a>
                                )}
                                {apt.client_email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5" />
                                    {apt.client_email}
                                  </span>
                                )}
                              </div>
                              {apt.notes && (
                                <p className="text-sm text-muted-foreground mt-1 italic">📝 {apt.notes}</p>
                              )}
                            </div>

                            {/* Price + Actions */}
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {service?.price && (
                                <p className="font-semibold text-primary">€{service.price.toFixed(2)}</p>
                              )}
                              <div className="flex gap-1">
                                {apt.status === 'scheduled' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                                    onClick={() => updateStatus(apt.id, 'confirmed')}
                                    title="Confirmar"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                    Confirmar
                                  </Button>
                                )}
                                {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-gray-700 border-gray-200 hover:bg-gray-50"
                                    onClick={() => updateStatus(apt.id, 'completed')}
                                    title="Completada"
                                  >
                                    <Star className="w-3.5 h-3.5 mr-1" />
                                    Hecha
                                  </Button>
                                )}
                                {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => updateStatus(apt.id, 'cancelled')}
                                    title="Cancelar"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteAppointment(apt.id)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Day summary */}
              {appointments.length > 0 && (
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>Total: <strong className="text-foreground">{appointments.length} citas</strong></span>
                  <span>Confirmadas: <strong className="text-green-700">{appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length}</strong></span>
                  <span>Ingresos estimados: <strong className="text-primary">
                    €{appointments.reduce((sum, apt) => {
                      const s = services.find(sv => sv.id === apt.service_id);
                      return sum + (s?.price || 0);
                    }, 0).toFixed(2)}
                  </strong></span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SERVICIOS TAB ── */}
        <TabsContent value="servicios" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Mis Servicios
                  </CardTitle>
                  <CardDescription>Configura los servicios que ofreces en tu salón</CardDescription>
                </div>
                <Button onClick={() => setShowNewService(!showNewService)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* New service form */}
              {showNewService && (
                <Card className="mb-6 border-primary/30 bg-primary/5">
                  <CardContent className="pt-4">
                    <form onSubmit={createService} className="space-y-3">
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="md:col-span-3">
                          <Label>Nombre del servicio *</Label>
                          <Input
                            placeholder="Ej: Manicura semipermanente"
                            value={newService.name}
                            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Duración (minutos) *</Label>
                          <Input
                            type="number"
                            min={5}
                            max={480}
                            value={newService.duration_minutes}
                            onChange={(e) => setNewService({ ...newService, duration_minutes: Number(e.target.value) })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Precio (€)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Ej: 35"
                            value={newService.price}
                            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Descripción</Label>
                          <Input
                            placeholder="Opcional"
                            value={newService.description}
                            onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Guardando...' : 'Guardar'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowNewService(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Services list */}
              {services.length === 0 ? (
                <div className="text-center py-12">
                  <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground mb-2">Todavía no tienes servicios</p>
                  <p className="text-sm text-muted-foreground mb-6">Añade tus servicios para poder asignarlos a las citas y ver el precio automáticamente</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={addDefaultServices} disabled={isLoading} variant="outline">
                      ✨ Añadir servicios predeterminados
                    </Button>
                    <Button onClick={() => setShowNewService(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir manualmente
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.duration_minutes} min
                          {service.price ? ` · €${service.price}` : ''}
                          {service.description ? ` · ${service.description}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteService(service.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-sm text-muted-foreground text-center pt-2">{services.length} servicio{services.length !== 1 ? 's' : ''} activo{services.length !== 1 ? 's' : ''}</p>
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
