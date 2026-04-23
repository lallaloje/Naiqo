import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, CheckCircle, MapPin, Phone, Mail } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { logError } from '@/lib/logger';

interface Center {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  contact_email: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
}

const PublicBooking = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const [center, setCenter] = useState<Center | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    service_id: '',
    selected_time: '',
    notes: ''
  });

  useEffect(() => {
    loadCenterInfo();
    loadServices();
  }, [centerId]);

  useEffect(() => {
    if (formData.service_id && selectedDate) {
      loadAvailableSlots();
    }
  }, [formData.service_id, selectedDate]);

  const loadCenterInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('centers')
        .select('*')
        .eq('id', centerId)
        .single();

      if (error) throw error;
      setCenter(data);
    } catch (error) {
      console.error('Error loading center:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del centro",
        variant: "destructive",
      });
    }
  };

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('center_id', centerId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('smart-appointments', {
        body: {
          action: 'suggest_available_times',
          userId: centerId,
          serviceType: formData.service_id,
          preferredDate: selectedDate.toISOString().split('T')[0]
        }
      });

      if (error) throw error;
      
      const slots = data.available_slots?.map((slot: any) => slot.start_time) || [];
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const service = services.find(s => s.id === formData.service_id);
      if (!service) throw new Error('Servicio no encontrado');

      const appointmentDateTime = `${selectedDate.toISOString().split('T')[0]}T${formData.selected_time}:00Z`;
      
      const { error } = await supabase
        .from('appointments')
        .insert({
          center_id: centerId,
          service_id: formData.service_id,
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
          start_time: appointmentDateTime,
          end_time: new Date(new Date(appointmentDateTime).getTime() + service.duration_minutes * 60000).toISOString(),
          status: 'pending',
          notes: formData.notes,
          source: 'online'
        });

      if (error) throw error;

      setBookingComplete(true);
      toast({
        title: "¡Cita Reservada!",
        description: "Recibirás una confirmación por email",
      });
    } catch (error) {
      logError('PublicBooking:handleSubmit', error);
      toast({
        title: "Error",
        description: "No se pudo crear la cita. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!center) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Cargando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle>¡Cita Reservada!</CardTitle>
            <CardDescription>
              Hemos enviado una confirmación a {formData.client_email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-medium">{center.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-sm text-muted-foreground">Hora: {formData.selected_time}</p>
            </div>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{center.name}</CardTitle>
            <CardDescription className="space-y-1">
              {center.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{center.address}, {center.city}</span>
                </div>
              )}
              {center.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{center.phone}</span>
                </div>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle>Reserva tu Cita</CardTitle>
            <CardDescription>
              Completa el formulario para reservar tu cita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <h3 className="font-semibold">Tus Datos</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Nombre Completo *</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_email">Email *</Label>
                    <Input
                      id="client_email"
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_phone">Teléfono *</Label>
                    <Input
                      id="client_phone"
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Selección de Servicio */}
              <div className="space-y-4">
                <h3 className="font-semibold">Elige tu Servicio</h3>
                <div className="grid gap-3">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => setFormData({...formData, service_id: service.id})}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.service_id === service.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {service.duration_minutes} min
                            </Badge>
                          </div>
                        </div>
                        <p className="font-semibold">€{service.price?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selección de Fecha y Hora */}
              {formData.service_id && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Fecha y Hora</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>Selecciona una Fecha</Label>
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        disabled={(date) => date < new Date()}
                        className="rounded-md border w-full"
                      />
                    </div>
                    <div>
                      <Label>Horarios Disponibles</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {isLoading ? (
                          <p className="text-sm text-muted-foreground col-span-2">Cargando horarios...</p>
                        ) : availableSlots.length === 0 ? (
                          <p className="text-sm text-muted-foreground col-span-2">No hay horarios disponibles</p>
                        ) : (
                          availableSlots.map((slot) => (
                            <Button
                              key={slot}
                              type="button"
                              variant={formData.selected_time === slot ? "default" : "outline"}
                              onClick={() => setFormData({...formData, selected_time: slot})}
                              className="w-full"
                            >
                              {slot}
                            </Button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="¿Algo que debamos saber?"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading || !formData.service_id || !formData.selected_time}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Procesando...' : 'Confirmar Reserva'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicBooking;