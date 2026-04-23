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