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