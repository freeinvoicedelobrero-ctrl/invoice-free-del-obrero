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
