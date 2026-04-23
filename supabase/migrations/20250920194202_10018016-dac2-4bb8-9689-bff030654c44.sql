-- Update the default trial period from 30 days to 7 days
ALTER TABLE public.profiles 
ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');