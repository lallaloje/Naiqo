alter table public.appointments
  add column if not exists reminder_24h_sent boolean not null default false,
  add column if not exists reminder_2h_sent  boolean not null default false;
