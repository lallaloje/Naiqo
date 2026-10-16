-- Per-day schedule overrides: {"1": {"start": 9, "end": 21}, "6": {"start": 9, "end": 14}}
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS day_schedules JSONB NOT NULL DEFAULT '{}';
