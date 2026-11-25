-- Execute este SQL no SQL Editor do seu projeto no Supabase
create table if not exists public.boletos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  due_date text not null,
  value numeric(12, 2) not null,
  barcode text,
  paid boolean not null default false,
  recurring boolean not null default false,
  shared_with text,
  owner_email text,
  receipt_url text,
  created_at timestamptz not null default now()
);

alter table public.boletos
  add column if not exists recurring boolean not null default false;

alter table public.boletos
  add column if not exists shared_with text;

alter table public.boletos
  add column if not exists owner_email text;

alter table public.boletos
  add column if not exists receipt_url text;

create index if not exists idx_boletos_user_id on public.boletos (user_id);
create index if not exists idx_boletos_shared_with on public.boletos (shared_with);

-- Para uso inicial com Google Identity Services no frontend (chave anon):
grant usage on schema public to anon, authenticated;
grant all on table public.boletos to anon, authenticated;

alter table public.boletos enable row level security;

create policy "Permitir acesso aos boletos via API"
  on public.boletos
  for all
  using (true)
  with check (true);
