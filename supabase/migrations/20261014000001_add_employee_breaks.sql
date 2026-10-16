-- Add breaks column to employees (array of {start_hour, end_hour, label})
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS breaks JSONB NOT NULL DEFAULT '[]';
