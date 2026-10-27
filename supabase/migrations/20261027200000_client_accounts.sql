-- Tabla de perfiles de clientas (vincula auth.users con sus datos de contacto)
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       text,
  display_name text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- RLS: cada clienta solo puede ver/editar su propio perfil
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_profiles_self" ON public.client_profiles
  FOR ALL USING (auth.uid() = user_id);

-- RPC: obtener citas de la clienta autenticada (por email o teléfono del perfil)
CREATE OR REPLACE FUNCTION public.get_my_appointments()
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
    a.id, a.client_name, a.client_email, a.client_phone,
    a.start_time, a.end_time, a.status,
    a.salon_id, a.service_id,
    s.salon_name, s.user_id AS salon_user_id,
    sv.name AS service_name, sv.price AS service_price,
    sv.duration_minutes AS service_duration_minutes
  FROM appointments a
  LEFT JOIN salons   s  ON s.id  = a.salon_id
  LEFT JOIN services sv ON sv.id = a.service_id
  WHERE (
    (a.client_email IS NOT NULL AND a.client_email ILIKE (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ))
    OR
    (a.client_phone IS NOT NULL AND regexp_replace(a.client_phone, '[\s\-()]+', '', 'g') = (
      SELECT regexp_replace(phone, '[\s\-()]+', '', 'g')
      FROM public.client_profiles WHERE user_id = auth.uid()
    ))
  )
  ORDER BY a.start_time DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_appointments() TO authenticated;

-- RPC: obtener sellos de fidelidad de la clienta autenticada
CREATE OR REPLACE FUNCTION public.get_my_loyalty_cards()
RETURNS TABLE (
  id           uuid,
  salon_id     uuid,
  salon_name   text,
  stamps       int,
  client_name  text,
  updated_at   timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    lc.id, lc.salon_id, s.salon_name,
    lc.stamps, lc.client_name, lc.updated_at
  FROM loyalty_cards lc
  LEFT JOIN salons s ON s.id = lc.salon_id
  WHERE (
    (lc.client_email IS NOT NULL AND lc.client_email ILIKE (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ))
    OR
    (lc.client_phone IS NOT NULL AND regexp_replace(lc.client_phone, '[\s\-()]+', '', 'g') = (
      SELECT regexp_replace(phone, '[\s\-()]+', '', 'g')
      FROM public.client_profiles WHERE user_id = auth.uid()
    ))
  )
  ORDER BY lc.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_loyalty_cards() TO authenticated;
