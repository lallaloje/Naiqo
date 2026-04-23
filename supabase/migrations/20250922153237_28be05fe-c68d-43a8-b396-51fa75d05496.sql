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