-- Allow anyone (anon + authenticated) to view all salons for the client-facing app
CREATE POLICY IF NOT EXISTS "Public can view all salons"
ON public.salons FOR SELECT
TO anon, authenticated
USING (true);
