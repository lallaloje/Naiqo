-- RPC pública para buscar clientes por teléfono en la página de reservas
-- Permite que un cliente vea sus propios datos sin autenticación (security definer)
CREATE OR REPLACE FUNCTION public.lookup_client_by_phone(p_salon_id TEXT, p_phone TEXT)
RETURNS TABLE (name TEXT, phone TEXT, email TEXT)
LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT sc.name, sc.phone, COALESCE(sc.email, '') AS email
  FROM public.salon_clients sc
  JOIN public.salons s ON s.id = sc.salon_id
  WHERE (s.id::TEXT = p_salon_id OR s.booking_slug = LOWER(p_salon_id))
    AND sc.phone IS NOT NULL
    AND REGEXP_REPLACE(sc.phone, '[^0-9+]', '', 'g') = REGEXP_REPLACE(p_phone, '[^0-9+]', '', 'g')
  LIMIT 3;
$$;
