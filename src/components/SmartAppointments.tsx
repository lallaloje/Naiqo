import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BookingLinkCard from "@/components/BookingLinkCard";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  Plus, 
  Sparkles,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Settings,
  Bell
} from "lucide-react";
import { logError } from '@/lib/logger';

interface Appointment {
  id: string;
  center_id: string;
  service_id: string;
  staff_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

interface ServiceType {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  buffer_before: number;
  buffer_after: number;
  center_id: string;
  active: boolean;
  created_at: string;
}

const SmartAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [optimization, setOptimization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [newAppointment, setNewAppointment] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    service_type: '',
    appointment_time: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadAppointments();
      loadServiceTypes();
    }
  }, [user, selectedDate]);

  const loadAppointments = async () => {
    try {
      const startOfDay = `${selectedDate}T00:00:00Z`;
      const endOfDay = `${selectedDate}T23:59:59Z`;
      
      // Obtener el centro del usuario actual
      const { data: centerData } = await supabase
        .from('center_owners')
        .select('center_id')
        .eq('user_id', user?.id || '')
        .single();
      
      if (!centerData) return;
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('center_id', centerData.center_id)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      logError('SmartAppointments:loadAppointments', error);
    }
  };

  const loadServiceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setServiceTypes(data || []);
    } catch (error) {
      logError('SmartAppointments:loadServiceTypes', error);
    }
  };

  const optimizeSchedule = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-appointments', {
        body: {
          action: 'optimize_schedule',
          userId: user?.id,
          date: selectedDate
        }
      });

      if (error) throw error;
      setOptimization(data);
      toast({
        title: "Agenda Optimizada",
        description: "Se han encontrado optimizaciones para tu agenda.",
      });
    } catch (error) {
      logError('SmartAppointments:optimizeSchedule', error);
      toast({
        title: "Error",
        description: "No se pudo optimizar la agenda.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('smart-appointments', {
        body: {
          action: 'create_appointment',
          userId: user?.id,
          appointmentDate: selectedDate,
          ...newAppointment
        }
      });

      if (error) throw error;

      setNewAppointment({
        client_name: '',
        client_email: '',
        client_phone: '',
        service_type: '',
        appointment_time: '',
        notes: ''
      });
      setShowNewAppointment(false);
      loadAppointments();

      toast({
        title: "Cita Creada",
        description: "La cita se ha creado exitosamente.",
      });
    } catch (error) {
      logError('SmartAppointments:createAppointment', error);
      toast({
        title: "Error",
        description: "No se pudo crear la cita.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceColor = (serviceId: string) => {
    // Return a default color based on service
    return '#3b82f6';
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Gestión Inteligente de Citas</CardTitle>
            <CardDescription>
              Inicia sesión para gestionar tus citas con inteligencia artificial
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/auth'}>
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <CalendarIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">
            Gestión Inteligente de Citas
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Optimiza tu agenda con IA, gestiona citas y mejora la eficiencia de tu salón
        </p>
      </div>

      {/* Booking Link Card */}
      <BookingLinkCard />

      {/* Date Selector and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Agenda del Día
              </CardTitle>
              <CardDescription>
                Gestiona y optimiza tus citas diarias
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button 
                onClick={optimizeSchedule} 
                disabled={isLoading}
                className="bg-gradient-primary text-white hover:shadow-brand"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Optimizar
              </Button>
              <Button 
                onClick={() => setShowNewAppointment(!showNewAppointment)}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Cita
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Appointments List */}
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay citas programadas para este día</p>
              </div>
            ) : (
              appointments.map((appointment) => {
                const service = serviceTypes.find(s => s.id === appointment.service_id);
                const startTime = new Date(appointment.start_time);
                const endTime = new Date(appointment.end_time);
                const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                
                return (
                  <Card key={appointment.id} className="border-l-4" style={{ borderLeftColor: getServiceColor(appointment.service_id) }}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{appointment.client_name}</h3>
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status}
                            </Badge>
                            <Badge variant="outline">
                              {service?.name || 'Servicio'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ({durationMinutes} min)
                            </span>
                            {appointment.client_email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {appointment.client_email}
                              </span>
                            )}
                            {appointment.client_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {appointment.client_phone}
                              </span>
                            )}
                          </div>
                          {appointment.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{appointment.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">€{service?.price?.toFixed(2) || '0.00'}</p>
                          <Button size="sm" variant="ghost">
                            <Bell className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Appointment Form */}
      {showNewAppointment && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Cita</CardTitle>
            <CardDescription>
              Crear una nueva cita en tu agenda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createAppointment} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_name">Nombre del Cliente</Label>
                  <Input
                    id="client_name"
                    value={newAppointment.client_name}
                    onChange={(e) => setNewAppointment({...newAppointment, client_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={newAppointment.client_email}
                    onChange={(e) => setNewAppointment({...newAppointment, client_email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="client_phone">Teléfono</Label>
                  <Input
                    id="client_phone"
                    value={newAppointment.client_phone}
                    onChange={(e) => setNewAppointment({...newAppointment, client_phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="service_type">Servicio</Label>
                  <Select 
                    value={newAppointment.service_type} 
                    onValueChange={(value) => setNewAppointment({...newAppointment, service_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {service.duration_minutes}min - €{service.price || 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="appointment_time">Hora</Label>
                  <Input
                    id="appointment_time"
                    type="time"
                    value={newAppointment.appointment_time}
                    onChange={(e) => setNewAppointment({...newAppointment, appointment_time: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                  placeholder="Notas adicionales sobre la cita..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creando...' : 'Crear Cita'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowNewAppointment(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Optimization Results */}
      {optimization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Optimización de Agenda
            </CardTitle>
            <CardDescription>
              Eficiencia: {optimization.efficiency_score}/100
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">{optimization.summary}</p>
              
              {optimization.optimizations?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Sugerencias de Optimización</h4>
                  <div className="space-y-2">
                    {optimization.optimizations.map((opt: any, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium">{opt.description}</p>
                          <p className="text-sm text-muted-foreground">{opt.suggestion}</p>
                          <Badge variant="secondary" className="mt-1">
                            {opt.impact}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {optimization.available_slots?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Franjas Disponibles</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {optimization.available_slots.map((slot: any, index: number) => (
                      <Badge key={index} variant="outline" className="justify-center">
                        {slot.start_time}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartAppointments;