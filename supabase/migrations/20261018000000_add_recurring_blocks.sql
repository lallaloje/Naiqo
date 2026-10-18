CREATE TABLE IF NOT EXISTS public.recurring_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Bloqueado',
  start_hour TEXT NOT NULL,  -- e.g. '14:00'
  end_hour TEXT NOT NULL,    -- e.g. '16:00'
  days_of_week INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sun,1=Mon,...,6=Sat; empty=all days
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners manage recurring_blocks" ON public.recurring_blocks
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
