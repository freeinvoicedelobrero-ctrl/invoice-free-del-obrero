-- Invoice Free del Obrero — live store menus (run once in Supabase → SQL Editor)
-- A store publishes its menu (products, prices, availability, small photos).
-- No account needed: the owner's phone keeps a random menu id + secret.
--   menu_put : only the phone that holds the secret can create/update its menu.
--   menu_get : anyone with the menu id (the QR code) can read it. Nothing else is exposed.

create table if not exists public.menus (
  id          text primary key,
  secret_hash text not null,
  data        text not null,
  updated_at  timestamptz not null default now()
);
alter table public.menus enable row level security;   -- no policies: no direct table access
revoke all on public.menus from anon, authenticated;

create or replace function public.menu_get(p_id text)
returns table(data text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select m.data, m.updated_at from public.menus m where m.id = p_id;
$$;

create or replace function public.menu_put(p_id text, p_secret text, p_data text)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  h text := encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
  t timestamptz := now();
begin
  if p_id !~ '^[a-z0-9]{12}$' or length(p_secret) <> 32 then raise exception 'bad request'; end if;
  if length(p_data) > 3000000 then raise exception 'too large'; end if;   -- about 3 MB per menu
  insert into public.menus(id, secret_hash, data, updated_at)
  values (p_id, h, p_data, t)
  on conflict (id) do update
    set data = excluded.data, updated_at = t
    where public.menus.secret_hash = h;
  if not found then raise exception 'unauthorized'; end if;
  return t;
end $$;

revoke all on function public.menu_get(text) from public;
revoke all on function public.menu_put(text, text, text) from public;
grant execute on function public.menu_get(text) to anon, authenticated;
grant execute on function public.menu_put(text, text, text) to anon, authenticated;

-- ---------- orders from the menu (customer phone → store) ----------
-- Customers can create an order on a menu and check its status with the token they got back.
-- Only the store phone (menu secret) can list orders and change their status.
create table if not exists public.menu_orders (
  id         bigserial primary key,
  menu_id    text not null references public.menus(id) on delete cascade,
  num        int  not null,
  token      text not null,
  data       text not null,
  status     text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists menu_orders_menu_time on public.menu_orders(menu_id, created_at);
alter table public.menu_orders enable row level security;
revoke all on public.menu_orders from anon, authenticated;

create or replace function public.order_put(p_menu text, p_data text)
returns table(order_id bigint, order_num int, order_token text)
language plpgsql security definer set search_path = public as $$
declare n int; tk text; v_id bigint;
begin
  if not exists (select 1 from public.menus where id = p_menu) then raise exception 'no menu'; end if;
  if length(p_data) > 20000 then raise exception 'too large'; end if;
  if (select count(*) from public.menu_orders where menu_id = p_menu and created_at > now() - interval '1 hour') >= 300
    then raise exception 'too many orders'; end if;
  select coalesce(max(num), 0) + 1 into n from public.menu_orders
    where menu_id = p_menu and created_at >= date_trunc('day', now());
  tk := md5(random()::text || clock_timestamp()::text || p_menu);
  insert into public.menu_orders(menu_id, num, token, data) values (p_menu, n, tk, p_data) returning id into v_id;
  return query select v_id, n, tk;
end $$;

create or replace function public.order_get(p_menu text, p_id bigint, p_token text)
returns table(order_num int, status text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select o.num, o.status, o.updated_at from public.menu_orders o
  where o.menu_id = p_menu and o.id = p_id and o.token = p_token;
$$;

create or replace function public.orders_list(p_menu text, p_secret text)
returns table(id bigint, num int, data text, status text, created_at timestamptz, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select o.id, o.num, o.data, o.status, o.created_at, o.updated_at
  from public.menu_orders o join public.menus m on m.id = o.menu_id
  where o.menu_id = p_menu
    and m.secret_hash = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex')
    and o.created_at > now() - interval '2 days'
  order by o.created_at desc;
$$;

create or replace function public.order_set(p_menu text, p_secret text, p_id bigint, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('new','accepted','ready','done','cancelled') then raise exception 'bad status'; end if;
  update public.menu_orders o set status = p_status, updated_at = now()
  from public.menus m
  where o.id = p_id and o.menu_id = p_menu and m.id = o.menu_id
    and m.secret_hash = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
  if not found then raise exception 'unauthorized'; end if;
end $$;

revoke all on function public.order_put(text, text) from public;
revoke all on function public.order_get(text, bigint, text) from public;
revoke all on function public.orders_list(text, text) from public;
revoke all on function public.order_set(text, text, bigint, text) from public;
grant execute on function public.order_put(text, text) to anon, authenticated;
grant execute on function public.order_get(text, bigint, text) to anon, authenticated;
grant execute on function public.orders_list(text, text) to anon, authenticated;
grant execute on function public.order_set(text, text, bigint, text) to anon, authenticated;
