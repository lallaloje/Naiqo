CREATE TABLE IF NOT EXISTS public.client_payment_methods (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email            text,
  client_phone            text,
  stripe_customer_id      text NOT NULL,
  stripe_payment_method_id text NOT NULL,
  card_brand              text,
  card_last4              text,
  card_exp_month          int,
  card_exp_year           int,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- Índices para búsqueda rápida por email o teléfono
CREATE INDEX IF NOT EXISTS idx_cpm_email ON public.client_payment_methods (lower(client_email));
CREATE INDEX IF NOT EXISTS idx_cpm_phone ON public.client_payment_methods (client_phone);

-- RLS: solo accesible desde funciones SECURITY DEFINER (el anon no puede leer directamente)
ALTER TABLE public.client_payment_methods ENABLE ROW LEVEL SECURITY;
-- Sin políticas = solo service_role puede acceder (lo cual es lo que queremos desde Edge Functions)
