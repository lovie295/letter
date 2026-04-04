create extension if not exists pgcrypto;

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  recipient_name text not null,
  sender_name text not null,
  message text not null,
  design_id text not null default 'ivory',
  show_date boolean not null default false,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  expires_at timestamptz not null
);

alter table public.letters
add column if not exists show_date boolean not null default false;

alter table public.letters enable row level security;

drop policy if exists "Anyone can insert letters" on public.letters;
create policy "Anyone can insert letters"
on public.letters
for insert
to anon
with check (expires_at > now());

drop policy if exists "Anyone can read valid letters" on public.letters;
create policy "Anyone can read valid letters"
on public.letters
for select
to anon
using (expires_at > now());

drop policy if exists "Anyone can mark letters opened" on public.letters;
create policy "Anyone can mark letters opened"
on public.letters
for update
to anon
using (expires_at > now())
with check (expires_at > now());
