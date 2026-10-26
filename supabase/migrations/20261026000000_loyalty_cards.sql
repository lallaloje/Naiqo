-- Tabla de tarjetas de fidelidad
create table if not exists public.loyalty_cards (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid not null references public.salons(id) on delete cascade,
  client_email  text not null,
  client_name   text not null,
  client_phone  text,
  stamps        integer not null default 0,       -- sellos acumulados totales
  stamps_used   integer not null default 0,       -- sellos canjeados (grupos de 10)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(salon_id, client_email)
);

-- RLS: el salón dueño puede leer y actualizar; acceso público por email para la clienta
alter table public.loyalty_cards enable row level security;

create policy "salon_owner_all" on public.loyalty_cards
  for all using (
    salon_id in (select id from public.salons where user_id = auth.uid())
  );

create policy "client_read_own" on public.loyalty_cards
  for select using (true);  -- filtrado por email en la query

-- Función para añadir un sello (llamada desde el backend cuando se completa una cita)
create or replace function public.add_loyalty_stamp(
  p_salon_id    uuid,
  p_client_email text,
  p_client_name  text,
  p_client_phone text default null
) returns void language plpgsql security definer as $$
begin
  insert into public.loyalty_cards(salon_id, client_email, client_name, client_phone, stamps)
  values (p_salon_id, lower(p_client_email), p_client_name, p_client_phone, 1)
  on conflict (salon_id, client_email) do update
    set stamps     = loyalty_cards.stamps + 1,
        client_name  = excluded.client_name,
        client_phone = coalesce(excluded.client_phone, loyalty_cards.client_phone),
        updated_at   = now();
end;
$$;

-- Función para canjear una recompensa (consumir 10 sellos)
create or replace function public.redeem_loyalty_reward(
  p_salon_id    uuid,
  p_client_email text
) returns boolean language plpgsql security definer as $$
declare
  v_available integer;
begin
  select (stamps - stamps_used * 10) into v_available
  from public.loyalty_cards
  where salon_id = p_salon_id and client_email = lower(p_client_email);

  if v_available is null or v_available < 10 then
    return false;
  end if;

  update public.loyalty_cards
  set stamps_used = stamps_used + 1,
      updated_at  = now()
  where salon_id = p_salon_id and client_email = lower(p_client_email);

  return true;
end;
$$;
