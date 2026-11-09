-- Servicios adicionales por cita
alter table appointments add column if not exists additional_services jsonb default null;
