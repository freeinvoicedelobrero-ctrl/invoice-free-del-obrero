-- Invoice Free del Obrero — Supabase setup (run once in SQL Editor)
-- Two ways to save data in the cloud:
--   1) vaults    : 12-word phrase accounts. Data arrives already encrypted.
--                  Only reachable through the two functions below.
--   2) user_data : email accounts. Each user can only read/write their own row.

-- ---------- 12-word phrase vaults ----------
create table if not exists public.vaults (
  id          text primary key,
  secret_hash text not null,
  data        text not null,
  updated_at  timestamptz not null default now()
);
alter table public.vaults enable row level security;   -- no policies: no direct access
revoke all on public.vaults from anon, authenticated;

create or replace function public.vault_get(p_id text, p_secret text)
returns table(data text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select v.data, v.updated_at
  from public.vaults v
  where v.id = p_id
    and v.secret_hash = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
$$;

create or replace function public.vault_put(p_id text, p_secret text, p_data text)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  h text := encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
  t timestamptz := now();
begin
  if length(p_id) <> 64 or length(p_secret) <> 32 then raise exception 'bad request'; end if;
  if length(p_data) > 5000000 then raise exception 'too large'; end if;
  insert into public.vaults(id, secret_hash, data, updated_at)
  values (p_id, h, p_data, t)
  on conflict (id) do update
    set data = excluded.data, updated_at = t
    where public.vaults.secret_hash = h;
  if not found then raise exception 'unauthorized'; end if;
  return t;
end $$;

revoke all on function public.vault_get(text, text) from public;
revoke all on function public.vault_put(text, text, text) from public;
grant execute on function public.vault_get(text, text) to anon, authenticated;
grant execute on function public.vault_put(text, text, text) to anon, authenticated;

-- ---------- email accounts ----------
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       text not null,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;

drop policy if exists "own row" on public.user_data;
create policy "own row" on public.user_data
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.user_data to authenticated;
