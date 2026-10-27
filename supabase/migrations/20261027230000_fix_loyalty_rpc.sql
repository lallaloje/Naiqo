CREATE OR REPLACE FUNCTION public.get_my_loyalty_cards()
 RETURNS TABLE(
   id uuid, salon_id uuid, salon_name text,
   stamps integer, stamps_used integer,
   client_name text, updated_at timestamp with time zone,
   loyalty_stamps_required integer, loyalty_reward text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT
    lc.id, lc.salon_id, s.salon_name,
    lc.stamps, COALESCE(lc.stamps_used, 0) AS stamps_used,
    lc.client_name, lc.updated_at,
    COALESCE(s.loyalty_stamps_required, 10) AS loyalty_stamps_required,
    COALESCE(s.loyalty_reward, 'Servicio gratis') AS loyalty_reward
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
