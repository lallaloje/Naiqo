-- Permite a clientes buscar sus citas por teléfono (sin autenticación, SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_appointments_by_phone(p_phone TEXT)
RETURNS TABLE (
  id                       uuid,
  client_name              text,
  client_email             text,
  client_phone             text,
  start_time               timestamptz,
  end_time                 timestamptz,
  status                   text,
  salon_id                 uuid,
  service_id               uuid,
  salon_name               text,
  salon_user_id            uuid,
  service_name             text,
  service_price            numeric,
  service_duration_minutes int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    a.id,
    a.client_name,
    a.client_email,
    a.client_phone,
    a.start_time,
    a.end_time,
    a.status,
    a.salon_id,
    a.service_id,
    s.salon_name,
    s.user_id           AS salon_user_id,
    sv.name             AS service_name,
    sv.price            AS service_price,
    sv.duration_minutes AS service_duration_minutes
  FROM appointments a
  LEFT JOIN salons   s  ON s.id  = a.salon_id
  LEFT JOIN services sv ON sv.id = a.service_id
  WHERE regexp_replace(COALESCE(a.client_phone, ''), '[\s\-()]+', '', 'g')
        ILIKE '%' || regexp_replace(p_phone, '[\s\-()]+', '', 'g') || '%'
  ORDER BY a.start_time DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_appointments_by_phone(TEXT) TO anon, authenticated;

-- Permite a clientes cancelar su cita identificándose por teléfono
CREATE OR REPLACE FUNCTION public.cancel_appointment_by_phone(
  p_appointment_id uuid,
  p_client_phone   text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start timestamptz;
  v_status text;
  v_phone  text;
BEGIN
  SELECT start_time, status, client_phone
    INTO v_start, v_status, v_phone
    FROM appointments
   WHERE id = p_appointment_id;

  IF NOT FOUND THEN RETURN false; END IF;

  -- Verificar que el teléfono coincide (normalizado)
  IF regexp_replace(COALESCE(v_phone, ''), '[\s\-()]+', '', 'g')
     NOT ILIKE '%' || regexp_replace(p_client_phone, '[\s\-()]+', '', 'g') || '%'
  THEN RETURN false; END IF;

  -- Solo se pueden cancelar citas futuras que no estén ya canceladas/completadas
  IF v_start <= NOW() OR v_status IN ('cancelled', 'completed') THEN
    RETURN false;
  END IF;

  UPDATE appointments SET status = 'cancelled' WHERE id = p_appointment_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_appointment_by_phone(uuid, text) TO anon, authenticated;
