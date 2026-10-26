-- Configuración de fidelización por salón
alter table public.salons
  add column if not exists loyalty_enabled         boolean not null default false,
  add column if not exists loyalty_stamps_required integer not null default 10,
  add column if not exists loyalty_reward          text    not null default 'Servicio gratis';
