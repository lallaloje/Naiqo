-- Create privacy settings table
CREATE TABLE public.privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_processing_consent BOOLEAN NOT NULL DEFAULT true,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  analytics_consent BOOLEAN NOT NULL DEFAULT true,
  third_party_sharing BOOLEAN NOT NULL DEFAULT false,
  data_retention_period TEXT NOT NULL DEFAULT '2_years',
  encryption_enabled BOOLEAN NOT NULL DEFAULT true,
  local_processing_only BOOLEAN NOT NULL DEFAULT false,
  auto_delete_enabled BOOLEAN NOT NULL DEFAULT false,
  notification_preferences JSONB NOT NULL DEFAULT '{"privacy_updates": true, "security_alerts": true, "data_usage_reports": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on privacy_settings
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for privacy_settings
CREATE POLICY "Users can view their own privacy settings" 
ON public.privacy_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" 
ON public.privacy_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" 
ON public.privacy_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create user consents table
CREATE TABLE public.user_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

-- Enable RLS on user_consents
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Create policies for user_consents
CREATE POLICY "Users can view their own consents" 
ON public.user_consents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consents" 
ON public.user_consents 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create privacy audit log table
CREATE TABLE public.privacy_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on privacy_audit_log
ALTER TABLE public.privacy_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for privacy_audit_log
CREATE POLICY "Users can view their own privacy audit log" 
ON public.privacy_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit log entries" 
ON public.privacy_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for updated_at on privacy_settings
CREATE TRIGGER update_privacy_settings_updated_at
BEFORE UPDATE ON public.privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on user_consents
CREATE TRIGGER update_user_consents_updated_at
BEFORE UPDATE ON public.user_consents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();