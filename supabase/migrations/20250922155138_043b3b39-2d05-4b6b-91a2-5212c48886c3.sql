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