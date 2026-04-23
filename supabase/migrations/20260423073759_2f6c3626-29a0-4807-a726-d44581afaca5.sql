
-- ============ FIX SECURITY: function search_path ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ Add missing columns ============
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS onboarding_data JSONB;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS staff_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- ============ CENTERS ============
CREATE TABLE public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.center_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(center_id, user_id)
);
ALTER TABLE public.center_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own center memberships" ON public.center_owners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own center memberships" ON public.center_owners FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own centers" ON public.centers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.center_owners co WHERE co.center_id = centers.id AND co.user_id = auth.uid())
);
CREATE POLICY "Anyone can view centers for booking" ON public.centers FOR SELECT TO anon USING (true);
CREATE POLICY "Users can insert centers" ON public.centers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owners can update centers" ON public.centers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.center_owners co WHERE co.center_id = centers.id AND co.user_id = auth.uid())
);

-- ============ SERVICES ============
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price NUMERIC,
  buffer_before INTEGER NOT NULL DEFAULT 0,
  buffer_after INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view active services" ON public.services FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Public can view active services" ON public.services FOR SELECT TO anon USING (active = true);
CREATE POLICY "Center owners manage services" ON public.services FOR ALL USING (
  EXISTS (SELECT 1 FROM public.center_owners co WHERE co.center_id = services.center_id AND co.user_id = auth.uid())
);

-- ============ NAIL IMAGES ============
CREATE TABLE public.nail_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID REFERENCES public.nail_conditions(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  finger TEXT,
  age_range TEXT,
  skin_tone TEXT,
  has_dermatoscopy BOOLEAN NOT NULL DEFAULT false,
  lab_result TEXT,
  resolution TEXT,
  quality_score NUMERIC,
  source TEXT NOT NULL DEFAULT 'user_upload',
  attribution TEXT,
  usage_rights TEXT NOT NULL DEFAULT 'clinical_only',
  consent_version TEXT,
  clinical_consent BOOLEAN NOT NULL DEFAULT false,
  ml_consent BOOLEAN NOT NULL DEFAULT false,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  is_anonymized BOOLEAN NOT NULL DEFAULT true,
  reported_issues INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.nail_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view active images" ON public.nail_images FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Users can upload images" ON public.nail_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Uploader can update own images" ON public.nail_images FOR UPDATE USING (auth.uid() = uploaded_by);

-- ============ IMAGE ANNOTATIONS ============
CREATE TABLE public.image_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES public.nail_images(id) ON DELETE CASCADE,
  annotator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  annotation_type TEXT NOT NULL,
  annotation_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.image_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can create annotations" ON public.image_annotations FOR INSERT TO authenticated WITH CHECK (auth.uid() = annotator_id);
CREATE POLICY "Authenticated can view annotations" ON public.image_annotations FOR SELECT TO authenticated USING (true);

-- ============ STORAGE BUCKET FOR NAIL IMAGES ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('nail-images', 'nail-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view nail images" ON storage.objects FOR SELECT USING (bucket_id = 'nail-images');
CREATE POLICY "Authenticated can upload nail images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nail-images');
CREATE POLICY "Users can update own nail images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'nail-images' AND owner = auth.uid());
CREATE POLICY "Users can delete own nail images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'nail-images' AND owner = auth.uid());
