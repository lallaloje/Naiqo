-- Add onboarding fields to salons table
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_data jsonb DEFAULT null;