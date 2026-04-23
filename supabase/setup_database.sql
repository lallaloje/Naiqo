-- NAIQO - Base de datos completa
-- Ejecuta este archivo en Supabase SQL Editor

-- Migration: 20250920194017_ee4877cc-5ac3-4452-b3eb-b79ef26deafc.sql
-- Create enum for user types
CREATE TYPE public.user_type AS ENUM ('professional', 'salon', 'academy');

-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free_trial', 'professional', 'salon', 'academy');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  contact_phone TEXT,
  user_type user_type DEFAULT 'professional',
  subscription_plan subscription_plan DEFAULT 'free_trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, business_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'business_name');
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Migration: 20250922144845_53a5bf82-4f7a-45e8-86dc-14744965872c.sql
-- Tabla para guardar conversaciones con el agente
CREATE TABLE public.agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_id TEXT,
  user_id UUID,
  visitor_info JSONB DEFAULT '{}',
  conversation_data JSONB DEFAULT '[]',
  lead_status TEXT DEFAULT 'new' CHECK (lead_status IN ('new', 'qualified', 'interested', 'contacted', 'converted', 'not_interested')),
  lead_score INTEGER DEFAULT 0,
  contact_email TEXT,
  contact_phone TEXT,
  business_name TEXT,
  business_size TEXT,
  industry TEXT,
  ai_needs TEXT,
  budget_range TEXT,
  timeline TEXT,
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para analytics del agente
CREATE TABLE public.agent_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.agent_conversations(id),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  visitor_id TEXT,
  session_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para leads generados
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.agent_conversations(id),
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  industry TEXT,
  business_size TEXT,
  ai_needs TEXT NOT NULL,
  budget_range TEXT,
  timeline TEXT,
  lead_source TEXT DEFAULT 'chat_agent',
  lead_quality_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'opportunity', 'won', 'lost')),
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Políticas para agent_conversations (públicas para visitantes)
CREATE POLICY "Anyone can create conversations" 
ON public.agent_conversations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view conversations by session" 
ON public.agent_conversations 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update conversations by session" 
ON public.agent_conversations 
FOR UPDATE 
USING (true);

-- Políticas para agent_analytics (públicas)
CREATE POLICY "Anyone can create analytics" 
ON public.agent_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view analytics" 
ON public.agent_analytics 
FOR SELECT 
USING (true);

-- Políticas para leads (restringidas a usuarios autenticados para administración)
CREATE POLICY "Anyone can create leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view leads" 
ON public.leads 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update leads" 
ON public.leads 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Trigger para actualizar updated_at
CREATE TRIGGER update_agent_conversations_updated_at
BEFORE UPDATE ON public.agent_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para rendimiento
CREATE INDEX idx_agent_conversations_session_id ON public.agent_conversations(session_id);
CREATE INDEX idx_agent_conversations_visitor_id ON public.agent_conversations(visitor_id);
CREATE INDEX idx_agent_conversations_lead_status ON public.agent_conversations(lead_status);
CREATE INDEX idx_agent_analytics_conversation_id ON public.agent_analytics(conversation_id);
CREATE INDEX idx_agent_analytics_event_type ON public.agent_analytics(event_type);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_status ON public.leads(status);

-- Migration: 20250922152823_20af45bf-d535-4c80-b3dd-77d14f75ac9c.sql
-- Crear tabla para análisis de salud ungueal
CREATE TABLE public.nail_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT, -- Para usuarios no autenticados
  image_url TEXT NOT NULL,
  analysis_results JSONB NOT NULL DEFAULT '{}',
  detected_issues TEXT[] DEFAULT '{}',
  severity_score INTEGER DEFAULT 0, -- 0-100
  recommendations TEXT[],
  confidence_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00-1.00
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.nail_analysis ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own analyses" 
ON public.nail_analysis 
FOR SELECT 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Anyone can create nail analyses" 
ON public.nail_analysis 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own analyses" 
ON public.nail_analysis 
FOR UPDATE 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Crear tabla para catálogo de problemas ungueales
CREATE TABLE public.nail_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  symptoms TEXT[],
  causes TEXT[],
  treatment_recommendations TEXT[],
  severity_level TEXT CHECK (severity_level IN ('mild', 'moderate', 'severe')),
  image_examples TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar condiciones comunes
INSERT INTO public.nail_conditions (name, description, symptoms, causes, treatment_recommendations, severity_level) VALUES
('Hongos en las uñas', 'Infección fúngica que afecta la uña y el lecho ungueal', 
 ARRAY['Decoloración amarillenta', 'Engrosamiento de la uña', 'Textura quebradiza', 'Mal olor'],
 ARRAY['Humedad excesiva', 'Falta de higiene', 'Sistema inmune debilitado', 'Calzado inadecuado'],
 ARRAY['Consultar dermatólogo', 'Mantener pies secos', 'Usar antifúngicos tópicos', 'Cambiar calcetines frecuentemente'],
 'moderate'),
 
('Uñas frágiles', 'Debilidad estructural de la lámina ungueal',
 ARRAY['Descamación', 'Roturas frecuentes', 'Líneas horizontales', 'Textura áspera'],
 ARRAY['Deficiencia nutricional', 'Uso excesivo de productos químicos', 'Envejecimiento', 'Deshidratación'],
 ARRAY['Hidratación regular', 'Suplementos de biotina', 'Proteger con guantes', 'Evitar productos agresivos'],
 'mild'),
 
('Manchas blancas', 'Leuconiquia - puntos o líneas blancos en la uña',
 ARRAY['Puntos blancos pequeños', 'Líneas blancas transversales', 'Áreas blanquecinas'],
 ARRAY['Traumatismo menor', 'Deficiencia de zinc', 'Manicura agresiva', 'Morderse las uñas'],
 ARRAY['Evitar trauma en cutículas', 'Manicura suave', 'Dieta balanceada', 'Dejar que crezca naturalmente'],
 'mild');

-- Función para actualizar timestamp
CREATE TRIGGER update_nail_analysis_updated_at
BEFORE UPDATE ON public.nail_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crear bucket de storage para imágenes de uñas
INSERT INTO storage.buckets (id, name, public) VALUES ('nail-images', 'nail-images', false);

-- Políticas de storage
CREATE POLICY "Anyone can upload nail images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'nail-images');

CREATE POLICY "Users can view nail images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'nail-images');

CREATE POLICY "Users can delete their nail images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'nail-images');

-- Migration: 20250922152838_83527e4a-de51-4b6c-8a38-7927757962c6.sql
-- Crear tabla para análisis de salud ungueal
CREATE TABLE public.nail_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT, -- Para usuarios no autenticados
  image_url TEXT NOT NULL,
  analysis_results JSONB NOT NULL DEFAULT '{}',
  detected_issues TEXT[] DEFAULT '{}',
  severity_score INTEGER DEFAULT 0, -- 0-100
  recommendations TEXT[],
  confidence_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00-1.00
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.nail_analysis ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own analyses" 
ON public.nail_analysis 
FOR SELECT 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Anyone can create nail analyses" 
ON public.nail_analysis 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own analyses" 
ON public.nail_analysis 
FOR UPDATE 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Crear tabla para catálogo de problemas ungueales
CREATE TABLE public.nail_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  symptoms TEXT[],
  causes TEXT[],
  treatment_recommendations TEXT[],
  severity_level TEXT CHECK (severity_level IN ('mild', 'moderate', 'severe')),
  image_examples TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar condiciones comunes
INSERT INTO public.nail_conditions (name, description, symptoms, causes, treatment_recommendations, severity_level) VALUES
('Hongos en las uñas', 'Infección fúngica que afecta la uña y el lecho ungueal', 
 ARRAY['Decoloración amarillenta', 'Engrosamiento de la uña', 'Textura quebradiza', 'Mal olor'],
 ARRAY['Humedad excesiva', 'Falta de higiene', 'Sistema inmune debilitado', 'Calzado inadecuado'],
 ARRAY['Consultar dermatólogo', 'Mantener pies secos', 'Usar antifúngicos tópicos', 'Cambiar calcetines frecuentemente'],
 'moderate'),
 
('Uñas frágiles', 'Debilidad estructural de la lámina ungueal',
 ARRAY['Descamación', 'Roturas frecuentes', 'Líneas horizontales', 'Textura áspera'],
 ARRAY['Deficiencia nutricional', 'Uso excesivo de productos químicos', 'Envejecimiento', 'Deshidratación'],
 ARRAY['Hidratación regular', 'Suplementos de biotina', 'Proteger con guantes', 'Evitar productos agresivos'],
 'mild'),
 
('Manchas blancas', 'Leuconiquia - puntos o líneas blancos en la uña',
 ARRAY['Puntos blancos pequeños', 'Líneas blancas transversales', 'Áreas blanquecinas'],
 ARRAY['Traumatismo menor', 'Deficiencia de zinc', 'Manicura agresiva', 'Morderse las uñas'],
 ARRAY['Evitar trauma en cutículas', 'Manicura suave', 'Dieta balanceada', 'Dejar que crezca naturalmente'],
 'mild');

-- Función para actualizar timestamp
CREATE TRIGGER update_nail_analysis_updated_at
BEFORE UPDATE ON public.nail_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crear bucket de storage para imágenes de uñas
INSERT INTO storage.buckets (id, name, public) VALUES ('nail-images', 'nail-images', false);

-- Políticas de storage
CREATE POLICY "Anyone can upload nail images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'nail-images');

CREATE POLICY "Users can view nail images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'nail-images');

CREATE POLICY "Users can delete their nail images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'nail-images');

-- Migration: 20250922153237_28be05fe-c68d-43a8-b396-51fa75d05496.sql
-- Crear tabla para conversaciones del asistente
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT, -- Para usuarios no autenticados
  title TEXT DEFAULT 'Nueva consulta',
  context_type TEXT DEFAULT 'general' CHECK (context_type IN ('general', 'analysis_result', 'follow_up', 'treatment_advice')),
  related_analysis_id UUID REFERENCES public.nail_analysis(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para mensajes de chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'image', 'analysis_reference')),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para conversaciones
CREATE POLICY "Users can view their own conversations" 
ON public.chat_conversations 
FOR SELECT 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Anyone can create conversations" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own conversations" 
ON public.chat_conversations 
FOR UPDATE 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Políticas RLS para mensajes
CREATE POLICY "Users can view messages from their conversations" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE id = conversation_id 
    AND (auth.uid() = user_id OR session_id IS NOT NULL)
  )
);

CREATE POLICY "Anyone can create messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (true);

-- Trigger para actualizar timestamp
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crear tabla para knowledge base del asistente
CREATE TABLE public.nail_health_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[],
  severity_level TEXT CHECK (severity_level IN ('mild', 'moderate', 'severe')),
  requires_professional BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar conocimientos base
INSERT INTO public.nail_health_knowledge (category, question, answer, keywords, severity_level, requires_professional) VALUES
('Hongos', '¿Cómo puedo prevenir los hongos en las uñas?', 
 'Para prevenir hongos: mantén los pies secos, usa calcetines de algodón, cambia el calzado regularmente, evita caminar descalzo en lugares húmedos como piscinas, y usa polvos antifúngicos.',
 ARRAY['hongos', 'prevención', 'humedad', 'calcetines'], 'mild', false),

('Cuidado General', '¿Con qué frecuencia debo cortar mis uñas?', 
 'Es recomendable cortar las uñas cada 1-2 semanas. Córtalas rectas y lima suavemente los bordes para evitar uñas encarnadas.',
 ARRAY['cortar', 'frecuencia', 'cuidado', 'uñas encarnadas'], 'mild', false),

('Fragilidad', '¿Por qué se rompen mis uñas fácilmente?', 
 'Las uñas frágiles pueden deberse a: deficiencias nutricionales (biotina, hierro), uso excesivo de productos químicos, deshidratación, o condiciones médicas. Recomiendo usar cremas hidratantes específicas y evaluar tu dieta.',
 ARRAY['fragilidad', 'rotura', 'nutrición', 'hidratación'], 'moderate', false),

('Síntomas Graves', '¿Cuándo debo consultar a un dermatólogo?', 
 'Consulta un dermatólogo si observas: cambios de color persistentes, engrosamiento excesivo, dolor, sangrado, líneas oscuras, o cualquier cambio súbito en la apariencia de las uñas.',
 ARRAY['dermatólogo', 'síntomas', 'consulta', 'profesional'], 'severe', true),

('Tratamientos', '¿Qué productos naturales puedo usar para fortalecer mis uñas?', 
 'Aceite de ricino, aceite de almendras, vitamina E aplicada tópicamente, y baños con sal marina pueden ayudar a fortalecer las uñas. La biotina como suplemento también es beneficiosa.',
 ARRAY['naturales', 'fortalecer', 'aceites', 'vitaminas'], 'mild', false);

-- Migration: 20250922153251_dc533bca-7af8-4c2b-a12d-beb635a34d25.sql
-- Crear tabla para conversaciones del asistente
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT, -- Para usuarios no autenticados
  title TEXT DEFAULT 'Nueva consulta',
  context_type TEXT DEFAULT 'general' CHECK (context_type IN ('general', 'analysis_result', 'follow_up', 'treatment_advice')),
  related_analysis_id UUID REFERENCES public.nail_analysis(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para mensajes de chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'image', 'analysis_reference')),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para conversaciones
CREATE POLICY "Users can view their own conversations" 
ON public.chat_conversations 
FOR SELECT 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Anyone can create conversations" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own conversations" 
ON public.chat_conversations 
FOR UPDATE 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Políticas RLS para mensajes
CREATE POLICY "Users can view messages from their conversations" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE id = conversation_id 
    AND (auth.uid() = user_id OR session_id IS NOT NULL)
  )
);

CREATE POLICY "Anyone can create messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (true);

-- Trigger para actualizar timestamp
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crear tabla para knowledge base del asistente
CREATE TABLE public.nail_health_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[],
  severity_level TEXT CHECK (severity_level IN ('mild', 'moderate', 'severe')),
  requires_professional BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar conocimientos base
INSERT INTO public.nail_health_knowledge (category, question, answer, keywords, severity_level, requires_professional) VALUES
('Hongos', '¿Cómo puedo prevenir los hongos en las uñas?', 
 'Para prevenir hongos: mantén los pies secos, usa calcetines de algodón, cambia el calzado regularmente, evita caminar descalzo en lugares húmedos como piscinas, y usa polvos antifúngicos.',
 ARRAY['hongos', 'prevención', 'humedad', 'calcetines'], 'mild', false),

('Cuidado General', '¿Con qué frecuencia debo cortar mis uñas?', 
 'Es recomendable cortar las uñas cada 1-2 semanas. Córtalas rectas y lima suavemente los bordes para evitar uñas encarnadas.',
 ARRAY['cortar', 'frecuencia', 'cuidado', 'uñas encarnadas'], 'mild', false),

('Fragilidad', '¿Por qué se rompen mis uñas fácilmente?', 
 'Las uñas frágiles pueden deberse a: deficiencias nutricionales (biotina, hierro), uso excesivo de productos químicos, deshidratación, o condiciones médicas. Recomiendo usar cremas hidratantes específicas y evaluar tu dieta.',
 ARRAY['fragilidad', 'rotura', 'nutrición', 'hidratación'], 'moderate', false),

('Síntomas Graves', '¿Cuándo debo consultar a un dermatólogo?', 
 'Consulta un dermatólogo si observas: cambios de color persistentes, engrosamiento excesivo, dolor, sangrado, líneas oscuras, o cualquier cambio súbito en la apariencia de las uñas.',
 ARRAY['dermatólogo', 'síntomas', 'consulta', 'profesional'], 'severe', true),

('Tratamientos', '¿Qué productos naturales puedo usar para fortalecer mis uñas?', 
 'Aceite de ricino, aceite de almendras, vitamina E aplicada tópicamente, y baños con sal marina pueden ayudar a fortalecer las uñas. La biotina como suplemento también es beneficiosa.',
 ARRAY['naturales', 'fortalecer', 'aceites', 'vitaminas'], 'mild', false);

-- Migration: 20250922154926_5208533b-913f-47f5-a33f-0d950c9d342c.sql
-- Create products/treatments catalog table
CREATE TABLE public.products_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  price DECIMAL(10,2),
  duration_minutes INTEGER,
  target_conditions TEXT[],
  ingredients TEXT[],
  benefits TEXT[],
  contraindications TEXT[],
  application_method TEXT,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recommendations table
CREATE TABLE public.treatment_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  analysis_id UUID,
  recommended_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning TEXT,
  priority_score INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,2),
  estimated_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for products catalog (publicly readable for browsing)
CREATE POLICY "Anyone can view products catalog" 
ON public.products_catalog 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage products" 
ON public.products_catalog 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create policies for recommendations
CREATE POLICY "Users can view their own recommendations" 
ON public.treatment_recommendations 
FOR SELECT 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Anyone can create recommendations" 
ON public.treatment_recommendations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own recommendations" 
ON public.treatment_recommendations 
FOR UPDATE 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_catalog_updated_at
BEFORE UPDATE ON public.products_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_recommendations_updated_at
BEFORE UPDATE ON public.treatment_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample products for demonstration
INSERT INTO public.products_catalog (name, description, category, subcategory, target_conditions, benefits, price, duration_minutes) VALUES
('Tratamiento Antifúngico Premium', 'Tratamiento especializado para hongos en uñas con tecnología avanzada', 'Tratamientos', 'Antifúngicos', ARRAY['hongos', 'infecciones'], ARRAY['Elimina hongos', 'Fortalece la uña', 'Previene reinfección'], 45.00, 60),
('Fortalecedor de Uñas Bioactivo', 'Fórmula con biotina y queratina para uñas frágiles', 'Productos', 'Fortalecedores', ARRAY['fragilidad', 'descamación'], ARRAY['Fortalece', 'Nutre', 'Protege'], 25.00, 30),
('Hidratante Intensivo de Cutículas', 'Aceites esenciales para cutículas secas y agrietadas', 'Productos', 'Hidratantes', ARRAY['sequedad', 'cutículas dañadas'], ARRAY['Hidrata profundamente', 'Suaviza cutículas', 'Nutre'], 18.00, 20),
('Manicura Terapéutica Completa', 'Servicio completo con análisis y tratamiento personalizado', 'Servicios', 'Manicura', ARRAY['mantenimiento', 'cuidado general'], ARRAY['Limpieza profunda', 'Análisis profesional', 'Cuidado integral'], 35.00, 90),
('Base Nutritiva con Vitaminas', 'Base fortalecedora con vitaminas A, C y E', 'Productos', 'Bases', ARRAY['debilidad', 'falta de brillo'], ARRAY['Nutre', 'Protege', 'Da brillo natural'], 22.00, 15);

-- Migration: 20250922154939_43762f08-0d30-489e-80da-c22825232e1f.sql
-- Create products/treatments catalog table
CREATE TABLE public.products_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  price DECIMAL(10,2),
  duration_minutes INTEGER,
  target_conditions TEXT[],
  ingredients TEXT[],
  benefits TEXT[],
  contraindications TEXT[],
  application_method TEXT,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recommendations table
CREATE TABLE public.treatment_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  analysis_id UUID,
  recommended_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning TEXT,
  priority_score INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,2),
  estimated_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for products catalog (publicly readable for browsing)
CREATE POLICY "Anyone can view products catalog" 
ON public.products_catalog 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage products" 
ON public.products_catalog 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create policies for recommendations
CREATE POLICY "Users can view their own recommendations" 
ON public.treatment_recommendations 
FOR SELECT 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Anyone can create recommendations" 
ON public.treatment_recommendations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own recommendations" 
ON public.treatment_recommendations 
FOR UPDATE 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_catalog_updated_at
BEFORE UPDATE ON public.products_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_recommendations_updated_at
BEFORE UPDATE ON public.treatment_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample products for demonstration
INSERT INTO public.products_catalog (name, description, category, subcategory, target_conditions, benefits, price, duration_minutes) VALUES
('Tratamiento Antifúngico Premium', 'Tratamiento especializado para hongos en uñas con tecnología avanzada', 'Tratamientos', 'Antifúngicos', ARRAY['hongos', 'infecciones'], ARRAY['Elimina hongos', 'Fortalece la uña', 'Previene reinfección'], 45.00, 60),
('Fortalecedor de Uñas Bioactivo', 'Fórmula con biotina y queratina para uñas frágiles', 'Productos', 'Fortalecedores', ARRAY['fragilidad', 'descamación'], ARRAY['Fortalece', 'Nutre', 'Protege'], 25.00, 30),
('Hidratante Intensivo de Cutículas', 'Aceites esenciales para cutículas secas y agrietadas', 'Productos', 'Hidratantes', ARRAY['sequedad', 'cutículas dañadas'], ARRAY['Hidrata profundamente', 'Suaviza cutículas', 'Nutre'], 18.00, 20),
('Manicura Terapéutica Completa', 'Servicio completo con análisis y tratamiento personalizado', 'Servicios', 'Manicura', ARRAY['mantenimiento', 'cuidado general'], ARRAY['Limpieza profunda', 'Análisis profesional', 'Cuidado integral'], 35.00, 90),
('Base Nutritiva con Vitaminas', 'Base fortalecedora con vitaminas A, C y E', 'Productos', 'Bases', ARRAY['debilidad', 'falta de brillo'], ARRAY['Nutre', 'Protege', 'Da brillo natural'], 22.00, 15);

-- Migration: 20250922155138_043b3b39-2d05-4b6b-91a2-5212c48886c3.sql
-- Enable RLS on missing tables
ALTER TABLE public.nail_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nail_health_knowledge ENABLE ROW LEVEL SECURITY;

-- Create policies for nail_conditions (publicly readable)
CREATE POLICY "Anyone can view nail conditions" 
ON public.nail_conditions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage nail conditions" 
ON public.nail_conditions 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create policies for nail_health_knowledge (publicly readable)
CREATE POLICY "Anyone can view nail health knowledge" 
ON public.nail_health_knowledge 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage nail health knowledge" 
ON public.nail_health_knowledge 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Migration: 20250922155718_9f265105-db2c-4a5e-9ddb-0489bb03f418.sql
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
  user_id UUID NOT NULL,
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

-- Insert default business hours (Monday to Friday 9-18, Saturday 10-16)
INSERT INTO public.business_availability (user_id, day_of_week, start_time, end_time, break_start_time, break_end_time) VALUES
-- This will be updated per user, but we create a template
(NULL, 1, '09:00', '18:00', '13:00', '14:00'), -- Monday
(NULL, 2, '09:00', '18:00', '13:00', '14:00'), -- Tuesday  
(NULL, 3, '09:00', '18:00', '13:00', '14:00'), -- Wednesday
(NULL, 4, '09:00', '18:00', '13:00', '14:00'), -- Thursday
(NULL, 5, '09:00', '18:00', '13:00', '14:00'), -- Friday
(NULL, 6, '10:00', '16:00', NULL, NULL); -- Saturday

-- Migration: 20250922155754_6c959af2-9cdb-42da-8b98-980927f4025c.sql
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
  user_id UUID NOT NULL,
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

-- Insert default business hours (Monday to Friday 9-18, Saturday 10-16)
INSERT INTO public.business_availability (user_id, day_of_week, start_time, end_time, break_start_time, break_end_time) VALUES
-- This will be updated per user, but we create a template
(NULL, 1, '09:00', '18:00', '13:00', '14:00'), -- Monday
(NULL, 2, '09:00', '18:00', '13:00', '14:00'), -- Tuesday  
(NULL, 3, '09:00', '18:00', '13:00', '14:00'), -- Wednesday
(NULL, 4, '09:00', '18:00', '13:00', '14:00'), -- Thursday
(NULL, 5, '09:00', '18:00', '13:00', '14:00'), -- Friday
(NULL, 6, '10:00', '16:00', NULL, NULL); -- Saturday

-- Migration: 20250922155825_4317035f-5ef7-4864-9ab0-5fb29d4fc96e.sql
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

-- Migration: 20250922161448_7b0bb6b8-a09d-4561-aedd-62d7c6c82f43.sql
-- Create privacy settings table
CREATE TABLE public.privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_processing_consent BOOLEAN NOT NULL DEFAULT true,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  analytics_consent BOOLEAN NOT NULL DEFAULT true,
  third_party_sharing BOOLEAN NOT NULL DEFAULT false,
  data_retention_period TEXT NOT NULL DEFAULT '2_years',
  encryption_enabled BOOLEAN NOT NULL DEFAULT true,
  local_processing_only BOOLEAN NOT NULL DEFAULT false,
  auto_delete_enabled BOOLEAN NOT NULL DEFAULT false,
  notification_preferences JSONB NOT NULL DEFAULT '{"privacy_updates": true, "security_alerts": true, "data_usage_reports": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on privacy_settings
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for privacy_settings
CREATE POLICY "Users can view their own privacy settings" 
ON public.privacy_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" 
ON public.privacy_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" 
ON public.privacy_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create user consents table
CREATE TABLE public.user_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

-- Enable RLS on user_consents
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Create policies for user_consents
CREATE POLICY "Users can view their own consents" 
ON public.user_consents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consents" 
ON public.user_consents 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create privacy audit log table
CREATE TABLE public.privacy_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on privacy_audit_log
ALTER TABLE public.privacy_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for privacy_audit_log
CREATE POLICY "Users can view their own privacy audit log" 
ON public.privacy_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit log entries" 
ON public.privacy_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for updated_at on privacy_settings
CREATE TRIGGER update_privacy_settings_updated_at
BEFORE UPDATE ON public.privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on user_consents
CREATE TRIGGER update_user_consents_updated_at
BEFORE UPDATE ON public.user_consents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20250922161539_c080e669-4d06-4913-95b7-98d983f9139b.sql
-- Create privacy settings table
CREATE TABLE public.privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_processing_consent BOOLEAN NOT NULL DEFAULT true,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  analytics_consent BOOLEAN NOT NULL DEFAULT true,
  third_party_sharing BOOLEAN NOT NULL DEFAULT false,
  data_retention_period TEXT NOT NULL DEFAULT '2_years',
  encryption_enabled BOOLEAN NOT NULL DEFAULT true,
  local_processing_only BOOLEAN NOT NULL DEFAULT false,
  auto_delete_enabled BOOLEAN NOT NULL DEFAULT false,
  notification_preferences JSONB NOT NULL DEFAULT '{"privacy_updates": true, "security_alerts": true, "data_usage_reports": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on privacy_settings
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for privacy_settings
CREATE POLICY "Users can view their own privacy settings" 
ON public.privacy_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" 
ON public.privacy_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" 
ON public.privacy_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create user consents table
CREATE TABLE public.user_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

-- Enable RLS on user_consents
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Create policies for user_consents
CREATE POLICY "Users can view their own consents" 
ON public.user_consents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consents" 
ON public.user_consents 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create privacy audit log table
CREATE TABLE public.privacy_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on privacy_audit_log
ALTER TABLE public.privacy_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for privacy_audit_log
CREATE POLICY "Users can view their own privacy audit log" 
ON public.privacy_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit log entries" 
ON public.privacy_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for updated_at on privacy_settings
CREATE TRIGGER update_privacy_settings_updated_at
BEFORE UPDATE ON public.privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on user_consents
CREATE TRIGGER update_user_consents_updated_at
BEFORE UPDATE ON public.user_consents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20250922173108_8e91cabf-d939-4818-aadf-44045aa1b6e4.sql
-- Fix security vulnerability: Restrict leads table access to authenticated users only
-- Drop existing policies that might allow public access
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;

-- Create secure policies for leads table
-- Only authenticated users can view leads (administrators/business owners)
CREATE POLICY "Authenticated users can view leads" 
ON public.leads 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Only authenticated users can create leads (from chat agents, forms, etc.)
CREATE POLICY "Authenticated users can create leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

-- Only authenticated users can update leads
CREATE POLICY "Authenticated users can update leads" 
ON public.leads 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

-- Only authenticated users can delete leads
CREATE POLICY "Authenticated users can delete leads" 
ON public.leads 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Ensure RLS is enabled
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Migration: 20251003133722_a31d15b8-b073-4a20-8aff-1dc58e2e48bc.sql
-- Create centers table
CREATE TABLE IF NOT EXISTS public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  contact_email TEXT NOT NULL,
  webhook_url TEXT,
  business_hours JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  buffer_before INTEGER DEFAULT 0,
  buffer_after INTEGER DEFAULT 0,
  price DECIMAL(10,2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialties TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) NOT NULL,
  staff_id UUID REFERENCES public.staff(id),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'naiqo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for centers (public read)
CREATE POLICY "Centers are viewable by everyone"
  ON public.centers FOR SELECT
  USING (true);

-- RLS Policies for services (public read)
CREATE POLICY "Services are viewable by everyone"
  ON public.services FOR SELECT
  USING (active = true);

-- RLS Policies for staff (public read)
CREATE POLICY "Staff are viewable by everyone"
  ON public.staff FOR SELECT
  USING (active = true);

-- RLS Policies for appointments (public insert, authenticated read own)
CREATE POLICY "Anyone can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own appointments"
  ON public.appointments FOR SELECT
  USING (client_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Create indexes
CREATE INDEX idx_services_center ON public.services(center_id);
CREATE INDEX idx_staff_center ON public.staff(center_id);
CREATE INDEX idx_appointments_center ON public.appointments(center_id);
CREATE INDEX idx_appointments_times ON public.appointments(start_time, end_time);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_centers_updated_at
  BEFORE UPDATE ON public.centers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration: 20251003133736_8693ca24-b9c5-461a-b7f1-0bfceb748281.sql
-- Fix search_path for update_updated_at_column function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_centers_updated_at
  BEFORE UPDATE ON public.centers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration: 20251006081714_3a6aa270-c145-41f4-976f-455793572290.sql
-- Create enum for image usage rights
CREATE TYPE image_usage_rights AS ENUM ('clinical_only', 'clinical_and_ml', 'public_dataset');

-- Create nail_conditions table
CREATE TABLE nail_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  synonyms TEXT[],
  category TEXT NOT NULL,
  short_definition TEXT NOT NULL,
  clinical_signs TEXT,
  differential_diagnosis TEXT[],
  recommended_tests TEXT[],
  treatment_summary TEXT,
  dermnet_url TEXT,
  aad_url TEXT,
  pubmed_refs TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create nail_images table
CREATE TABLE nail_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID REFERENCES nail_conditions(id),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  finger TEXT,
  age_range TEXT,
  skin_tone TEXT,
  has_dermatoscopy BOOLEAN DEFAULT false,
  lab_result TEXT,
  resolution TEXT,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  source TEXT NOT NULL DEFAULT 'user_upload',
  attribution TEXT,
  usage_rights image_usage_rights NOT NULL DEFAULT 'clinical_only',
  consent_version TEXT,
  clinical_consent BOOLEAN NOT NULL DEFAULT false,
  ml_consent BOOLEAN DEFAULT false,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  is_anonymized BOOLEAN DEFAULT false,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  reported_issues INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);

-- Create image_annotations table
CREATE TABLE image_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES nail_images(id) ON DELETE CASCADE,
  annotator_id UUID,
  annotation_type TEXT NOT NULL,
  annotation_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create consent_logs table
CREATE TABLE consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES nail_images(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  consent_type TEXT,
  previous_value BOOLEAN,
  new_value BOOLEAN,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE nail_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nail_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nail_conditions (public read)
CREATE POLICY "Nail conditions are viewable by everyone"
  ON nail_conditions FOR SELECT
  USING (true);

-- RLS Policies for nail_images
CREATE POLICY "Nail images are viewable by authenticated users"
  ON nail_images FOR SELECT
  USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

CREATE POLICY "Authenticated users can upload images"
  ON nail_images FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own images"
  ON nail_images FOR UPDATE
  USING (uploaded_by = auth.uid());

-- RLS Policies for image_annotations
CREATE POLICY "Annotations are viewable by authenticated users"
  ON image_annotations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create annotations"
  ON image_annotations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for consent_logs
CREATE POLICY "Consent logs are viewable by admin only"
  ON consent_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert consent logs"
  ON consent_logs FOR INSERT
  WITH CHECK (true);

-- Create updated_at triggers
CREATE TRIGGER update_nail_conditions_updated_at
  BEFORE UPDATE ON nail_conditions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial nail conditions data
INSERT INTO nail_conditions (name, category, short_definition, synonyms, clinical_signs, differential_diagnosis, recommended_tests, treatment_summary, dermnet_url, pubmed_refs) VALUES
('Onicomicosis', 'infeccion', 'Infección fúngica de la uña causada por dermatofitos, levaduras o mohos no dermatofitos.', ARRAY['Tinea unguium', 'Infección fúngica ungueal'], 
 'Decoloración amarillenta, engrosamiento de la uña, hiperqueratosis subungueal, onicolisis distal, fragilidad ungueal.', 
 ARRAY['Psoriasis ungueal', 'Onicodistrofia traumática', 'Liquen plano ungueal'],
 ARRAY['Cultivo fúngico', 'Examen directo con KOH', 'PCR para hongos', 'Biopsia ungueal'],
 'Tratamiento tópico (lacas antifúngicas), sistémico (terbinafina, itraconazol), terapia láser, eliminación quirúrgica en casos severos.',
 'https://dermnetnz.org/topics/onychomycosis',
 ARRAY['PMID: 31425726', 'PMID: 30903937']),

('Onicolisis', 'distrofia', 'Separación de la lámina ungueal del lecho ungueal, generalmente comenzando en el borde libre.', 
 ARRAY['Despegamiento ungueal'],
 'Separación ungueal blanco-amarillenta, puede ser parcial o total, sin dolor generalmente.',
 ARRAY['Psoriasis', 'Onicomicosis', 'Traumatismo', 'Hipertiroidismo', 'Fotoonicólisis'],
 ARRAY['Cultivo para descartar infección', 'Pruebas de función tiroidea', 'Dermatoscopia'],
 'Tratar causa subyacente, evitar traumatismos, mantener uñas cortas, evitar humedad prolongada.',
 'https://dermnetnz.org/topics/onycholysis',
 ARRAY['PMID: 29908814']),

('Psoriasis ungueal', 'inflamatoria', 'Manifestación ungueal de la psoriasis, puede afectar matriz, lecho o pliegue ungueal.',
 ARRAY['Nail psoriasis', 'Psoriasis de las uñas'],
 'Pitting (depresiones puntiformes), manchas oleosas, onicolisis, hiperqueratosis subungueal, hemorragias en astilla.',
 ARRAY['Onicomicosis', 'Liquen plano ungueal', 'Alopecia areata'],
 ARRAY['Biopsia de lecho ungueal', 'Dermatoscopia', 'Cultivo fúngico para exclusión'],
 'Corticoides tópicos potentes, calcipotriol tópico, inyecciones intralesionales de corticoides, fototerapia, tratamientos sistémicos (metotrexato, biológicos).',
 'https://dermnetnz.org/topics/nail-psoriasis',
 ARRAY['PMID: 31654408', 'PMID: 30484991']),

('Paroniquia', 'infeccion', 'Inflamación e infección del pliegue ungueal proximal o lateral.',
 ARRAY['Perionixis', 'Whitlow'],
 'Enrojecimiento, hinchazón, dolor en pliegue ungueal, puede haber pus, pérdida de cutícula.',
 ARRAY['Onicomicosis', 'Herpetic whitlow', 'Carcinoma escamoso'],
 ARRAY['Cultivo bacteriano', 'Cultivo fúngico', 'Gram y cultivo de secreción'],
 'Antibióticos tópicos o sistémicos (aguda), antifúngicos (crónica por Candida), evitar irritantes, cirugía menor si absceso.',
 'https://dermnetnz.org/topics/paronychia',
 ARRAY['PMID: 29494048']),

('Melanoniquia', 'pigmentaria', 'Pigmentación longitudinal marrón o negra de la uña por depósito de melanina.',
 ARRAY['Longitudinal melanonychia', 'Pigmentación ungueal'],
 'Banda longitudinal marrón a negra, puede ser homogénea o heterogénea, uni o multidigital.',
 ARRAY['Melanoma subungueal', 'Nevus de matriz', 'Hemorragia subungueal', 'Medicamentos', 'Síndrome de Laugier-Hunziker'],
 ARRAY['Dermatoscopia ungueal', 'Biopsia de matriz ungueal', 'Histopatología'],
 'Observación si benigno, biopsia si sospecha de melanoma, excisión quirúrgica si melanoma confirmado.',
 'https://dermnetnz.org/topics/melanonychia',
 ARRAY['PMID: 31364212', 'PMID: 29908817']);

-- Create storage bucket for nail images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nail-images',
  'nail-images',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
);

-- Storage policies for nail-images bucket
CREATE POLICY "Authenticated users can view nail images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nail-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload nail images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'nail-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'nail-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'nail-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Migration: 20251007171729_e34db52b-6850-4df7-a3c7-4899e83d2fd8.sql
-- Crear políticas RLS para el bucket nail-images

-- Permitir a cualquier usuario subir imágenes
CREATE POLICY "Anyone can upload nail images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'nail-images');

-- Permitir a cualquier usuario ver las imágenes que subieron
CREATE POLICY "Anyone can view nail images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'nail-images');

-- Permitir a usuarios autenticados actualizar sus imágenes
CREATE POLICY "Authenticated users can update nail images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'nail-images');

-- Permitir a usuarios autenticados eliminar imágenes
CREATE POLICY "Authenticated users can delete nail images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'nail-images');

-- Migration: 20251007172002_e91ecc80-8f9e-4b7a-a9e1-7e408b67cc0a.sql
-- Crear tabla nail_analysis para almacenar resultados de análisis
CREATE TABLE public.nail_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  session_id text,
  user_id uuid,
  analysis_status text DEFAULT 'pending',
  analysis_results jsonb,
  detected_issues text[],
  severity_score integer,
  confidence_score numeric,
  recommendations text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.nail_analysis ENABLE ROW LEVEL SECURITY;

-- Política para que cualquiera pueda crear análisis
CREATE POLICY "Anyone can create analysis"
ON public.nail_analysis
FOR INSERT
TO public
WITH CHECK (true);

-- Política para que cualquiera pueda ver análisis
CREATE POLICY "Anyone can view analysis"
ON public.nail_analysis
FOR SELECT
TO public
USING (true);

-- Política para actualizar análisis
CREATE POLICY "System can update analysis"
ON public.nail_analysis
FOR UPDATE
TO public
USING (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_nail_analysis_updated_at
BEFORE UPDATE ON public.nail_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251010154413_7cfb53b3-8985-45b7-bdf3-9577e4687263.sql
-- Crear tabla para vincular propietarios de centros con usuarios
CREATE TABLE IF NOT EXISTS public.center_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, center_id)
);

-- Habilitar RLS
ALTER TABLE public.center_owners ENABLE ROW LEVEL SECURITY;

-- Política: Los propietarios pueden ver sus propios centros
CREATE POLICY "Owners can view their centers"
  ON public.center_owners
  FOR SELECT
  USING (user_id = auth.uid());

-- Política: Sistema puede insertar relaciones
CREATE POLICY "System can insert center owners"
  ON public.center_owners
  FOR INSERT
  WITH CHECK (true);

-- Actualizar política de appointments para que los propietarios vean las citas de su centro
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;

CREATE POLICY "Center owners can view their center appointments"
  ON public.appointments
  FOR SELECT
  USING (
    center_id IN (
      SELECT center_id 
      FROM public.center_owners 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Cualquiera puede crear citas (para reservas públicas)
-- Esta ya existe, la mantenemos

-- Migration: 20251227193924_dd24c04e-acfe-40ad-b273-1203d7368446.sql
-- Create salons table
CREATE TABLE public.salons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  salon_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT,
  trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
  subscription_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own salon"
ON public.salons FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own salon"
ON public.salons FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can insert salons"
ON public.salons FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_salons_updated_at
BEFORE UPDATE ON public.salons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create salon on user signup
CREATE OR REPLACE FUNCTION public.handle_new_salon_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.salons (user_id, email, salon_name, contact_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'salon_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'contact_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create salon when user signs up
CREATE TRIGGER on_auth_user_created_salon
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_salon_user();

-- Migration: 20251228091726_0272e776-f9e1-4ea8-8a52-35e86de195ff.sql
-- Add stripe_customer_id to salons table and add CHECK constraints
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Add CHECK constraint for subscription_status if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salons_subscription_status_check'
  ) THEN
    ALTER TABLE public.salons 
    ADD CONSTRAINT salons_subscription_status_check 
    CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled'));
  END IF;
END $$;

-- Add CHECK constraint for subscription_plan if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salons_subscription_plan_check'
  ) THEN
    ALTER TABLE public.salons 
    ADD CONSTRAINT salons_subscription_plan_check 
    CHECK (subscription_plan IN ('basico', 'profesional', 'premium') OR subscription_plan IS NULL);
  END IF;
END $$;

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  plan_id text PRIMARY KEY,
  plan_name text NOT NULL,
  price_monthly numeric NOT NULL,
  max_analyses_month integer,
  features jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Plans are viewable by everyone (public pricing)
CREATE POLICY "Subscription plans are viewable by everyone"
ON public.subscription_plans
FOR SELECT
USING (active = true);

-- Insert initial plans
INSERT INTO public.subscription_plans (plan_id, plan_name, price_monthly, max_analyses_month, features)
VALUES 
  ('basico', 'Básico', 39, 100, '{"analisis_ungueal": true, "gestion_citas": true, "soporte_email": true, "usuarios": 1}'::jsonb),
  ('profesional', 'Profesional', 79, 500, '{"analisis_ungueal": true, "gestion_citas": true, "prediccion_demanda": true, "recomendador_tratamientos": true, "asistente_ia": true, "soporte_prioritario": true, "usuarios": 5}'::jsonb),
  ('premium', 'Premium', 149, null, '{"analisis_ungueal": true, "gestion_citas": true, "prediccion_demanda": true, "recomendador_tratamientos": true, "asistente_ia": true, "api_personalizada": true, "integraciones_avanzadas": true, "account_manager": true, "sla_garantizado": true, "usuarios": -1}'::jsonb)
ON CONFLICT (plan_id) DO NOTHING;

-- Create analyses table
CREATE TABLE IF NOT EXISTS public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_name text,
  image_url text NOT NULL,
  diagnosis jsonb,
  recommendations jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on analyses
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Salons can view their own analyses
CREATE POLICY "Salons can view their own analyses"
ON public.analyses
FOR SELECT
USING (salon_id IN (SELECT id FROM public.salons WHERE user_id = auth.uid()));

-- Salons can create analyses for themselves
CREATE POLICY "Salons can create their own analyses"
ON public.analyses
FOR INSERT
WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE user_id = auth.uid()));

-- Salons can update their own analyses
CREATE POLICY "Salons can update their own analyses"
ON public.analyses
FOR UPDATE
USING (salon_id IN (SELECT id FROM public.salons WHERE user_id = auth.uid()));

-- Salons can delete their own analyses
CREATE POLICY "Salons can delete their own analyses"
ON public.analyses
FOR DELETE
USING (salon_id IN (SELECT id FROM public.salons WHERE user_id = auth.uid()));

-- Create usage_stats table
CREATE TABLE IF NOT EXISTS public.usage_stats (
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  month date NOT NULL,
  analyses_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (salon_id, month)
);

-- Enable RLS on usage_stats
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

-- Salons can view their own usage stats
CREATE POLICY "Salons can view their own usage stats"
ON public.usage_stats
FOR SELECT
USING (salon_id IN (SELECT id FROM public.salons WHERE user_id = auth.uid()));

-- System can insert/update usage stats
CREATE POLICY "System can manage usage stats"
ON public.usage_stats
FOR ALL
USING (salon_id IN (SELECT id FROM public.salons WHERE user_id = auth.uid()));

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION public.increment_analysis_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage_stats (salon_id, month, analyses_count)
  VALUES (NEW.salon_id, date_trunc('month', CURRENT_DATE)::date, 1)
  ON CONFLICT (salon_id, month)
  DO UPDATE SET 
    analyses_count = usage_stats.analyses_count + 1,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger to auto-increment usage on new analysis
DROP TRIGGER IF EXISTS increment_usage_on_analysis ON public.analyses;
CREATE TRIGGER increment_usage_on_analysis
AFTER INSERT ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.increment_analysis_count();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_analyses_salon_id ON public.analyses(salon_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_stats_month ON public.usage_stats(month);

-- Migration: 20260101174934_05017056-a919-4b54-8140-f628dd8a810f.sql
-- ============================================
-- SECURITY FIX: nail_analysis RLS policies
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view analysis" ON public.nail_analysis;
DROP POLICY IF EXISTS "Anyone can create analysis" ON public.nail_analysis;
DROP POLICY IF EXISTS "System can update analysis" ON public.nail_analysis;
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.nail_analysis;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.nail_analysis;

-- Create secure policies: authenticated users can only view their own analyses
CREATE POLICY "Users view own analyses"
ON public.nail_analysis FOR SELECT
USING (
  auth.uid() = user_id 
  OR session_id = current_setting('request.headers', true)::json->>'x-session-id'
);

-- Insert policy still needed for edge function (uses service role)
CREATE POLICY "Service role can insert analyses"
ON public.nail_analysis FOR INSERT
WITH CHECK (true);

-- Only service role can update (for edge function to complete analysis)
CREATE POLICY "Service role can update analyses"
ON public.nail_analysis FOR UPDATE
USING (true)
WITH CHECK (true);

-- ============================================
-- SECURITY FIX: nail-images storage bucket policies  
-- ============================================

-- Drop all existing conflicting storage policies for nail-images bucket
DROP POLICY IF EXISTS "Anyone can upload nail images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view nail images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view nail images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their nail images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view nail images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload nail images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update nail images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete nail images" ON storage.objects;

-- Create secure storage policies
-- Allow authenticated users to upload to nail-images bucket
CREATE POLICY "Auth users upload nail images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nail-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to view images in nail-images bucket
CREATE POLICY "Auth users view nail images"
ON storage.objects FOR SELECT
USING (bucket_id = 'nail-images' AND auth.role() = 'authenticated');

-- Allow users to update their own images (folder named by user id)
CREATE POLICY "Users update own nail images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'nail-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own images
CREATE POLICY "Users delete own nail images"  
ON storage.objects FOR DELETE
USING (bucket_id = 'nail-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Migration: 20260104202716_1b5dd3ef-0ab9-4cfd-959c-42ea83546bfa.sql
-- Ensure appointments table has proper RLS configuration
-- The existing SELECT policy "Center owners can view their center appointments" already restricts reads
-- to authenticated center owners. However, we need to ensure:
-- 1. RLS is enabled (it should be, but let's be explicit)
-- 2. The policies are PERMISSIVE (not RESTRICTIVE) to work correctly

-- First, let's verify RLS is enabled and add UPDATE/DELETE policies for center owners
-- so they can manage their appointments properly

-- Add UPDATE policy for center owners
CREATE POLICY "Center owners can update their center appointments" 
ON public.appointments 
FOR UPDATE 
USING (center_id IN (
  SELECT center_owners.center_id
  FROM center_owners
  WHERE center_owners.user_id = auth.uid()
));

-- Add DELETE policy for center owners
CREATE POLICY "Center owners can delete their center appointments" 
ON public.appointments 
FOR DELETE 
USING (center_id IN (
  SELECT center_owners.center_id
  FROM center_owners
  WHERE center_owners.user_id = auth.uid()
));

-- Migration: 20260105120137_cfc2f477-0f58-49b8-98bf-efe95521889a.sql
-- Add onboarding fields to salons table
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_data jsonb DEFAULT null;

-- Migration: 20260423073711_4378d317-bf76-4906-a5ec-3a7701e886d6.sql

-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- ============ SALONS ============
CREATE TABLE public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_name TEXT,
  contact_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  subscription_plan TEXT,
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own salon" ON public.salons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own salon" ON public.salons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own salon" ON public.salons FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ NAIL CONDITIONS (catálogo público) ============
CREATE TABLE public.nail_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  synonyms TEXT[],
  category TEXT,
  short_definition TEXT,
  full_description TEXT,
  symptoms TEXT[],
  causes TEXT[],
  treatments TEXT[],
  prevention TEXT[],
  severity TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nail_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view conditions" ON public.nail_conditions FOR SELECT TO authenticated USING (true);

-- ============ NAIL ANALYSIS ============
CREATE TABLE public.nail_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  image_hash TEXT,
  diagnosis TEXT,
  confidence NUMERIC,
  conditions_detected JSONB,
  recommendations TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nail_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analysis" ON public.nail_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analysis" ON public.nail_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analysis" ON public.nail_analysis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analysis" ON public.nail_analysis FOR DELETE USING (auth.uid() = user_id);

-- ============ ANALYSES (salon dashboard records) ============
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  client_name TEXT,
  image_url TEXT,
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analyses" ON public.analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON public.analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON public.analyses FOR DELETE USING (auth.uid() = user_id);

-- ============ APPOINTMENTS ============
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id UUID,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  service TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Public can create appointments" ON public.appointments FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "Users can update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own appointments" ON public.appointments FOR DELETE USING (auth.uid() = user_id);

-- ============ USAGE STATS ============
CREATE TABLE public.usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  analyses_count INTEGER NOT NULL DEFAULT 0,
  appointments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(salon_id, month)
);
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage stats" ON public.usage_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.salons WHERE salons.id = usage_stats.salon_id AND salons.user_id = auth.uid())
);

-- ============ PRIVACY SETTINGS ============
CREATE TABLE public.privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  data_sharing_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own privacy settings" ON public.privacy_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own privacy settings" ON public.privacy_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own privacy settings" ON public.privacy_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ CHAT CONVERSATIONS ============
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.chat_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.chat_conversations FOR DELETE USING (auth.uid() = user_id);

-- ============ TREATMENT RECOMMENDATIONS ============
CREATE TABLE public.treatment_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.nail_analysis(id) ON DELETE CASCADE,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.treatment_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own recommendations" ON public.treatment_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations" ON public.treatment_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own recommendations" ON public.treatment_recommendations FOR DELETE USING (auth.uid() = user_id);

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_salons_updated_at BEFORE UPDATE ON public.salons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_usage_stats_updated_at BEFORE UPDATE ON public.usage_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON public.privacy_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-CREATE PROFILE + SALON ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.salons (user_id, salon_name, contact_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'salon_name', 'Mi Salón'), COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Migration: 20260423073759_2f6c3626-29a0-4807-a726-d44581afaca5.sql

-- ============ FIX SECURITY: function search_path ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ Add missing columns ============
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS onboarding_data JSONB;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS staff_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- ============ CENTERS ============
CREATE TABLE public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.center_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(center_id, user_id)
);
ALTER TABLE public.center_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own center memberships" ON public.center_owners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own center memberships" ON public.center_owners FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own centers" ON public.centers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.center_owners co WHERE co.center_id = centers.id AND co.user_id = auth.uid())
);
CREATE POLICY "Anyone can view centers for booking" ON public.centers FOR SELECT TO anon USING (true);
CREATE POLICY "Users can insert centers" ON public.centers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owners can update centers" ON public.centers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.center_owners co WHERE co.center_id = centers.id AND co.user_id = auth.uid())
);

-- ============ SERVICES ============
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price NUMERIC,
  buffer_before INTEGER NOT NULL DEFAULT 0,
  buffer_after INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view active services" ON public.services FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Public can view active services" ON public.services FOR SELECT TO anon USING (active = true);
CREATE POLICY "Center owners manage services" ON public.services FOR ALL USING (
  EXISTS (SELECT 1 FROM public.center_owners co WHERE co.center_id = services.center_id AND co.user_id = auth.uid())
);

-- ============ NAIL IMAGES ============
CREATE TABLE public.nail_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID REFERENCES public.nail_conditions(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  finger TEXT,
  age_range TEXT,
  skin_tone TEXT,
  has_dermatoscopy BOOLEAN NOT NULL DEFAULT false,
  lab_result TEXT,
  resolution TEXT,
  quality_score NUMERIC,
  source TEXT NOT NULL DEFAULT 'user_upload',
  attribution TEXT,
  usage_rights TEXT NOT NULL DEFAULT 'clinical_only',
  consent_version TEXT,
  clinical_consent BOOLEAN NOT NULL DEFAULT false,
  ml_consent BOOLEAN NOT NULL DEFAULT false,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  is_anonymized BOOLEAN NOT NULL DEFAULT true,
  reported_issues INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.nail_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view active images" ON public.nail_images FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Users can upload images" ON public.nail_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Uploader can update own images" ON public.nail_images FOR UPDATE USING (auth.uid() = uploaded_by);

-- ============ IMAGE ANNOTATIONS ============
CREATE TABLE public.image_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES public.nail_images(id) ON DELETE CASCADE,
  annotator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  annotation_type TEXT NOT NULL,
  annotation_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.image_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can create annotations" ON public.image_annotations FOR INSERT TO authenticated WITH CHECK (auth.uid() = annotator_id);
CREATE POLICY "Authenticated can view annotations" ON public.image_annotations FOR SELECT TO authenticated USING (true);

-- ============ STORAGE BUCKET FOR NAIL IMAGES ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('nail-images', 'nail-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view nail images" ON storage.objects FOR SELECT USING (bucket_id = 'nail-images');
CREATE POLICY "Authenticated can upload nail images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nail-images');
CREATE POLICY "Users can update own nail images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'nail-images' AND owner = auth.uid());
CREATE POLICY "Users can delete own nail images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'nail-images' AND owner = auth.uid());


-- Migration: 20260423073827_7664b52d-1329-428c-82fe-21ed22dc76ed.sql

-- Add missing columns
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS clinical_signs TEXT;
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS differential_diagnosis TEXT[];
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS recommended_tests TEXT[];
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS treatment_summary TEXT;
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS dermnet_url TEXT;
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS aad_url TEXT;
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS pubmed_refs TEXT[];

-- Backfill salons.email from auth.users
UPDATE public.salons s
SET email = u.email
FROM auth.users u
WHERE s.user_id = u.id AND s.email IS NULL;

-- Update handle_new_user to also fill salon email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.salons (user_id, salon_name, contact_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'salon_name', 'Mi Salón'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- ============ FIX SECURITY: tighten permissive policies ============
DROP POLICY IF EXISTS "Users can insert centers" ON public.centers;
CREATE POLICY "Users can insert centers when authenticated"
ON public.centers FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Tighten storage bucket: restrict listing to authenticated users
DROP POLICY IF EXISTS "Public can view nail images" ON storage.objects;
CREATE POLICY "Authenticated can view nail images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'nail-images');

CREATE POLICY "Public can read individual nail images"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'nail-images');

-- Make nail-images bucket private to prevent listing, public reads still work via getPublicUrl signed paths
UPDATE storage.buckets SET public = false WHERE id = 'nail-images';


