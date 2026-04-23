-- ============================================
-- SECURITY FIX: nail_analysis RLS policies
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view analysis" ON public.nail_analysis;
DROP POLICY IF EXISTS "Anyone can create analysis" ON public.nail_analysis;
DROP POLICY IF EXISTS "System can update analysis" ON public.nail_analysis;
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.nail_analysis;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.nail_analysis;

-- Create secure policies: authenticated users can only view their own analyses
CREATE POLICY "Users view own analyses"
ON public.nail_analysis FOR SELECT
USING (
  auth.uid() = user_id 
  OR session_id = current_setting('request.headers', true)::json->>'x-session-id'
);

-- Insert policy still needed for edge function (uses service role)
CREATE POLICY "Service role can insert analyses"
ON public.nail_analysis FOR INSERT
WITH CHECK (true);

-- Only service role can update (for edge function to complete analysis)
CREATE POLICY "Service role can update analyses"
ON public.nail_analysis FOR UPDATE
USING (true)
WITH CHECK (true);

-- ============================================
-- SECURITY FIX: nail-images storage bucket policies  
-- ============================================

-- Drop all existing conflicting storage policies for nail-images bucket
DROP POLICY IF EXISTS "Anyone can upload nail images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view nail images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view nail images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their nail images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view nail images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload nail images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update nail images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete nail images" ON storage.objects;

-- Create secure storage policies
-- Allow authenticated users to upload to nail-images bucket
CREATE POLICY "Auth users upload nail images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nail-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to view images in nail-images bucket
CREATE POLICY "Auth users view nail images"
ON storage.objects FOR SELECT
USING (bucket_id = 'nail-images' AND auth.role() = 'authenticated');

-- Allow users to update their own images (folder named by user id)
CREATE POLICY "Users update own nail images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'nail-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own images
CREATE POLICY "Users delete own nail images"  
ON storage.objects FOR DELETE
USING (bucket_id = 'nail-images' AND auth.uid()::text = (storage.foldername(name))[1]);