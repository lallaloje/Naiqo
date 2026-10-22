-- Client portal improvements: booking slug + cancel by client

-- 1. Add booking_slug to salons (friendly URL identifier)
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS booking_slug TEXT UNIQUE;

-- 2. Update get_salon_for_booking to accept UUID or slug
DROP FUNCTION IF EXISTS public.get_salon_for_booking(UUID);
DROP FUNCTION IF EXISTS public.get_salon_for_booking(TEXT);

CREATE OR REPLACE FUNCTION public.get_salon_for_booking(p_salon_id TEXT)
RETURNS TABLE (
  id UUID, salon_name TEXT, phone TEXT, user_id UUID,
  day_schedules JSONB
)
LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.salon_name, s.phone, s.user_id,
    COALESCE(
      (SELECT e.day_schedules FROM public.employees e
       WHERE e.user_id = s.user_id AND e.active = true
       ORDER BY e.created_at LIMIT 1),
      '{}'::JSONB
    ) AS day_schedules
  FROM public.salons s
  WHERE s.id::TEXT = p_salon_id
     OR s.booking_slug = LOWER(p_salon_id)
  LIMIT 1;
$$;

-- 3. Update get_services_for_booking similarly
DROP FUNCTION IF EXISTS public.get_services_for_booking(UUID);
DROP FUNCTION IF EXISTS public.get_services_for_booking(TEXT);

CREATE OR REPLACE FUNCTION public.get_services_for_booking(p_salon_id TEXT)
RETURNS TABLE (id UUID, name TEXT, description TEXT, duration_minutes INT, price NUMERIC)
LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT sv.id, sv.name, sv.description, sv.duration_minutes, sv.price
  FROM public.services sv
  JOIN public.salons sl ON sl.user_id = sv.user_id
  WHERE (sl.id::TEXT = p_salon_id OR sl.booking_slug = LOWER(p_salon_id))
    AND sv.active = true
  ORDER BY sv.name;
$$;

-- 4. Update get_busy_slots similarly
DROP FUNCTION IF EXISTS public.get_busy_slots(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_busy_slots(UUID, DATE);
DROP FUNCTION IF EXISTS public.get_busy_slots(TEXT, DATE);

CREATE OR REPLACE FUNCTION public.get_busy_slots(p_salon_id TEXT, p_date DATE)
RETURNS TABLE (start_time TIMESTAMPTZ, end_time TIMESTAMPTZ)
LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT a.start_time, a.end_time
  FROM public.appointments a
  JOIN public.salons s ON s.id = a.salon_id
  WHERE (s.id::TEXT = p_salon_id OR s.booking_slug = LOWER(p_salon_id))
    AND a.start_time::DATE = p_date
    AND a.status NOT IN ('cancelled')
  UNION ALL
  SELECT b.start_time, b.end_time
  FROM public.blocked_slots b
  JOIN public.salons s ON s.user_id = b.user_id
  WHERE (s.id::TEXT = p_salon_id OR s.booking_slug = LOWER(p_salon_id))
    AND b.start_time::DATE = p_date
  ORDER BY start_time;
$$;

-- 5. Cancel appointment by client (verifies by email)
CREATE OR REPLACE FUNCTION public.cancel_appointment_by_client(
  p_appointment_id UUID,
  p_client_email TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.appointments
  SET status = 'cancelled'
  WHERE id = p_appointment_id
    AND LOWER(client_email) = LOWER(p_client_email)
    AND status NOT IN ('cancelled', 'completed')
    AND start_time > NOW();

  RETURN FOUND;
END;
$$;
