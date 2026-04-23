-- Crear tabla para vincular propietarios de centros con usuarios
CREATE TABLE IF NOT EXISTS public.center_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, center_id)
);

-- Habilitar RLS
ALTER TABLE public.center_owners ENABLE ROW LEVEL SECURITY;

-- Política: Los propietarios pueden ver sus propios centros
CREATE POLICY "Owners can view their centers"
  ON public.center_owners
  FOR SELECT
  USING (user_id = auth.uid());

-- Política: Sistema puede insertar relaciones
CREATE POLICY "System can insert center owners"
  ON public.center_owners
  FOR INSERT
  WITH CHECK (true);

-- Actualizar política de appointments para que los propietarios vean las citas de su centro
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;

CREATE POLICY "Center owners can view their center appointments"
  ON public.appointments
  FOR SELECT
  USING (
    center_id IN (
      SELECT center_id 
      FROM public.center_owners 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Cualquiera puede crear citas (para reservas públicas)
-- Esta ya existe, la mantenemos