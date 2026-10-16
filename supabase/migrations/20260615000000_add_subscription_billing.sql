alter table public.salons
  add column if not exists subscription_billing text check (subscription_billing in ('monthly', 'annual'));
