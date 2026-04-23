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