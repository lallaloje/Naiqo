-- Fix security vulnerability: Restrict leads table access to authenticated users only
-- Drop existing policies that might allow public access
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;

-- Create secure policies for leads table
-- Only authenticated users can view leads (administrators/business owners)
CREATE POLICY "Authenticated users can view leads" 
ON public.leads 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Only authenticated users can create leads (from chat agents, forms, etc.)
CREATE POLICY "Authenticated users can create leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

-- Only authenticated users can update leads
CREATE POLICY "Authenticated users can update leads" 
ON public.leads 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

-- Only authenticated users can delete leads
CREATE POLICY "Authenticated users can delete leads" 
ON public.leads 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Ensure RLS is enabled
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;