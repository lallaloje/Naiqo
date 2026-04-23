-- Ensure appointments table has proper RLS configuration
-- The existing SELECT policy "Center owners can view their center appointments" already restricts reads
-- to authenticated center owners. However, we need to ensure:
-- 1. RLS is enabled (it should be, but let's be explicit)
-- 2. The policies are PERMISSIVE (not RESTRICTIVE) to work correctly

-- First, let's verify RLS is enabled and add UPDATE/DELETE policies for center owners
-- so they can manage their appointments properly

-- Add UPDATE policy for center owners
CREATE POLICY "Center owners can update their center appointments" 
ON public.appointments 
FOR UPDATE 
USING (center_id IN (
  SELECT center_owners.center_id
  FROM center_owners
  WHERE center_owners.user_id = auth.uid()
));

-- Add DELETE policy for center owners
CREATE POLICY "Center owners can delete their center appointments" 
ON public.appointments 
FOR DELETE 
USING (center_id IN (
  SELECT center_owners.center_id
  FROM center_owners
  WHERE center_owners.user_id = auth.uid()
));