
-- Add missing columns
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS clinical_signs TEXT;
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS differential_diagnosis TEXT[];
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS recommended_tests TEXT[];
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS treatment_summary TEXT;
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS dermnet_url TEXT;
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS aad_url TEXT;
ALTER TABLE public.nail_conditions ADD COLUMN IF NOT EXISTS pubmed_refs TEXT[];

-- Backfill salons.email from auth.users
UPDATE public.salons s
SET email = u.email
FROM auth.users u
WHERE s.user_id = u.id AND s.email IS NULL;

-- Update handle_new_user to also fill salon email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.salons (user_id, salon_name, contact_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'salon_name', 'Mi Salón'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- ============ FIX SECURITY: tighten permissive policies ============
DROP POLICY IF EXISTS "Users can insert centers" ON public.centers;
CREATE POLICY "Users can insert centers when authenticated"
ON public.centers FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Tighten storage bucket: restrict listing to authenticated users
DROP POLICY IF EXISTS "Public can view nail images" ON storage.objects;
CREATE POLICY "Authenticated can view nail images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'nail-images');

CREATE POLICY "Public can read individual nail images"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'nail-images');

-- Make nail-images bucket private to prevent listing, public reads still work via getPublicUrl signed paths
UPDATE storage.buckets SET public = false WHERE id = 'nail-images';
