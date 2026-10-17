-- Create salon_clients table for storing client profiles
-- (separate from appointments-derived client list)
CREATE TABLE IF NOT EXISTS public.salon_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  tags TEXT,
  total_visits INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  first_visit DATE,
  last_visit DATE,
  total_spent NUMERIC DEFAULT 0,
  notes TEXT,
  imported_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salon_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners manage salon_clients" ON public.salon_clients
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
