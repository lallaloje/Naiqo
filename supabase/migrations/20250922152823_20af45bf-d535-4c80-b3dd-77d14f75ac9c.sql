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