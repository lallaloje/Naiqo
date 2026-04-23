-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  service_type TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  estimated_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business hours and availability table
CREATE TABLE public.business_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  break_start_time TIME,
  break_end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications/reminders table
CREATE TABLE public.appointment_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  message_content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service types catalog
CREATE TABLE public.service_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  color_code TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  requires_analysis BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments
CREATE POLICY "Users can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments" 
ON public.appointments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for business availability
CREATE POLICY "Users can manage their own availability" 
ON public.business_availability 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create policies for notifications
CREATE POLICY "Users can view notifications for their appointments" 
ON public.appointment_notifications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM appointments 
  WHERE appointments.id = appointment_notifications.appointment_id 
  AND appointments.user_id = auth.uid()
));

CREATE POLICY "System can create notifications" 
ON public.appointment_notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update notifications" 
ON public.appointment_notifications 
FOR UPDATE 
USING (true);

-- Create policies for service types
CREATE POLICY "Users can manage their own service types" 
ON public.service_types 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL) 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_availability_updated_at
BEFORE UPDATE ON public.business_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_types_updated_at
BEFORE UPDATE ON public.service_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default service types
INSERT INTO public.service_types (name, description, duration_minutes, price, color_code, user_id) VALUES
('Manicura Básica', 'Manicura tradicional con esmaltado', 45, 25.00, '#10b981', NULL),
('Manicura con Gel', 'Manicura con esmaltado en gel de larga duración', 60, 35.00, '#3b82f6', NULL),
('Análisis de Salud Ungueal', 'Análisis completo con IA y recomendaciones', 30, 20.00, '#8b5cf6', NULL),
('Tratamiento Antifúngico', 'Tratamiento especializado para problemas de hongos', 75, 45.00, '#ef4444', NULL),
('Pedicura Completa', 'Pedicura con cuidado integral de pies', 90, 40.00, '#f59e0b', NULL),
('Uñas Acrílicas', 'Aplicación de uñas acrílicas personalizadas', 120, 60.00, '#ec4899', NULL);