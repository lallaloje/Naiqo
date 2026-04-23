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