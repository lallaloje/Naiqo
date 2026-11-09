-- Tabla de tarjetas regalo
create table if not exists gift_cards (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  salon_id         uuid not null references salons(id) on delete cascade,
  service_id       uuid references services(id) on delete set null,
  service_name     text not null,
  price_cents      integer not null,
  buyer_name       text,
  buyer_email      text not null,
  recipient_name   text not null,
  recipient_email  text not null,
  message          text,
  status           text not null default 'active' check (status in ('active','used','expired')),
  stripe_session_id text,
  expires_at       timestamptz not null,
  used_at          timestamptz,
  created_at       timestamptz not null default now()
);

-- Índices
create index if not exists gift_cards_salon_id_idx on gift_cards(salon_id);
create index if not exists gift_cards_code_idx on gift_cards(code);
create index if not exists gift_cards_recipient_email_idx on gift_cards(recipient_email);

-- RLS
alter table gift_cards enable row level security;

-- El salón propietario puede ver y actualizar sus tarjetas
create policy "salon_owner_gift_cards" on gift_cards
  for all
  using (
    salon_id in (
      select id from salons where user_id = auth.uid()
    )
  );

-- Service role puede hacer todo (para el webhook y edge functions)
create policy "service_role_gift_cards" on gift_cards
  for all
  to service_role
  using (true)
  with check (true);
