-- Time tracking table for employee clock-in/out
CREATE TABLE IF NOT EXISTS public.time_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id     UUID        REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id  UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  clock_in     TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out    TIMESTAMPTZ,
  break_start  TIMESTAMPTZ,
  break_end    TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners manage time entries" ON public.time_entries
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id     ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in    ON public.time_entries(clock_in);
