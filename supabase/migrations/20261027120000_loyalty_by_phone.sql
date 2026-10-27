-- Permitir client_email nulo en loyalty_cards (para clientas creadas solo con teléfono)
ALTER TABLE public.loyalty_cards ALTER COLUMN client_email DROP NOT NULL;

-- Cambiar el unique constraint para permitir (salon_id, client_phone) cuando no hay email
ALTER TABLE public.loyalty_cards DROP CONSTRAINT IF EXISTS loyalty_cards_salon_id_client_email_key;
ALTER TABLE public.loyalty_cards ADD CONSTRAINT loyalty_cards_salon_id_client_email_key
  UNIQUE NULLS NOT DISTINCT (salon_id, client_email);
ALTER TABLE public.loyalty_cards ADD CONSTRAINT loyalty_cards_salon_id_client_phone_key
  UNIQUE NULLS NOT DISTINCT (salon_id, client_phone);

-- Actualizar add_loyalty_stamp para funcionar con email o teléfono
CREATE OR REPLACE FUNCTION public.add_loyalty_stamp(
  p_salon_id     uuid,
  p_client_email text default null,
  p_client_name  text default '',
  p_client_phone text default null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Buscar tarjeta existente por email o por teléfono
  IF p_client_email IS NOT NULL THEN
    INSERT INTO public.loyalty_cards(salon_id, client_email, client_name, client_phone, stamps)
    VALUES (p_salon_id, lower(p_client_email), p_client_name, p_client_phone, 1)
    ON CONFLICT (salon_id, client_email) DO UPDATE
      SET stamps       = loyalty_cards.stamps + 1,
          updated_at   = now(),
          client_phone = coalesce(excluded.client_phone, loyalty_cards.client_phone),
          client_name  = coalesce(nullif(excluded.client_name,''), loyalty_cards.client_name);
  ELSIF p_client_phone IS NOT NULL THEN
    INSERT INTO public.loyalty_cards(salon_id, client_email, client_name, client_phone, stamps)
    VALUES (p_salon_id, null, p_client_name, p_client_phone, 1)
    ON CONFLICT (salon_id, client_phone) DO UPDATE
      SET stamps      = loyalty_cards.stamps + 1,
          updated_at  = now(),
          client_name = coalesce(nullif(excluded.client_name,''), loyalty_cards.client_name);
  END IF;
END;
$$;
