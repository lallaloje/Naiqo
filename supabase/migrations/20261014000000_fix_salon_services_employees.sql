-- ============================================================
-- Fix salon-based services, employees table, and appointments
-- ============================================================

-- 1. Add user_id and category to services table
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ALTER COLUMN center_id DROP NOT NULL;

-- Update RLS so salon owners can manage their own services
DROP POLICY IF EXISTS "Center owners manage services" ON public.services;
DROP POLICY IF EXISTS "Authenticated can view active services" ON public.services;
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;

CREATE POLICY "Salon owners manage their services" ON public.services
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view active services by salon" ON public.services
  FOR SELECT USING (active = true);

-- 2. Create employees table (used by EmployeesSection and SmartAppointments)
CREATE TABLE IF NOT EXISTS public.employees (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id        UUID        REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  email           TEXT,
  phone           TEXT,
  role            TEXT        NOT NULL DEFAULT 'nail_tech',
  color           TEXT        NOT NULL DEFAULT '#e879a0',
  active          BOOLEAN     NOT NULL DEFAULT true,
  working_days    INTEGER[]   NOT NULL DEFAULT '{1,2,3,4,5}',
  work_start_hour INTEGER     NOT NULL DEFAULT 9,
  work_end_hour   INTEGER     NOT NULL DEFAULT 20,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners manage employees" ON public.employees
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_salon_id ON public.employees(salon_id);

-- 3. Add employee_id to appointments (SmartAppointments uses employee_id, DB has staff_id)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Also add stripe-related columns used by SmartAppointments interface
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id       TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_charged     BOOLEAN NOT NULL DEFAULT false;

-- 4. Add work_start_hour / work_end_hour to salons (used by SmartAppointments)
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS work_start_hour INTEGER NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS work_end_hour   INTEGER NOT NULL DEFAULT 21;

-- 5. Add beta status to subscription_status check (some salons are on 'beta')
ALTER TABLE public.salons DROP CONSTRAINT IF EXISTS salons_subscription_status_check;
ALTER TABLE public.salons
  ADD CONSTRAINT salons_subscription_status_check
  CHECK (subscription_status IN ('trial','beta','active','past_due','expired','cancelled'));

-- 6. Trigger updated_at for employees
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Create blocked_slots table (used by SmartAppointments to block time)
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   UUID        REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT 'Bloqueado',
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners manage blocked slots" ON public.blocked_slots
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_blocked_slots_user_id  ON public.blocked_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_salon_id ON public.blocked_slots(salon_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_times    ON public.blocked_slots(start_time, end_time);
