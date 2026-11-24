-- Execute este SQL no SQL Editor do seu projeto no Supabase
create table if not exists public.boletos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  due_date text not null,
  value numeric(12, 2) not null,
  barcode text,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_boletos_user_id on public.boletos (user_id);

-- Para uso inicial com Google Identity Services no frontend (chave anon):
alter table public.boletos enable row level security;

create policy "Permitir acesso aos boletos via API"
  on public.boletos
  for all
  using (true)
  with check (true);
