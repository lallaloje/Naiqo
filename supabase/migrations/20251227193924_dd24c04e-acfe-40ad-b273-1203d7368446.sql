-- Create salons table
CREATE TABLE public.salons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  salon_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT,
  trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
  subscription_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own salon"
ON public.salons FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own salon"
ON public.salons FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can insert salons"
ON public.salons FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_salons_updated_at
BEFORE UPDATE ON public.salons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create salon on user signup
CREATE OR REPLACE FUNCTION public.handle_new_salon_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.salons (user_id, email, salon_name, contact_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'salon_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'contact_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create salon when user signs up
CREATE TRIGGER on_auth_user_created_salon
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_salon_user();