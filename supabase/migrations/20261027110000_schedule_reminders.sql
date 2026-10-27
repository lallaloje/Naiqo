-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Eliminar job previo si existía
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-reminders-hourly') THEN
    PERFORM cron.unschedule('send-reminders-hourly');
  END IF;
END;
$$;

-- Ejecutar send-reminders cada hora en punto
SELECT cron.schedule(
  'send-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tpwdbapkfmewxtatoytr.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ' ||
               current_setting('app.settings.service_role_key', true) ||
               '"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
