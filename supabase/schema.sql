-- EVENTORA organizer dashboard: initial secure database schema
-- Run this entire file in Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.eventora_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  venue text,
  registration_deadline date,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('EVT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  event_id uuid references public.events(id) on delete set null,
  event_name text not null,
  participant_name text not null,
  email text not null,
  institution text,
  team_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registrations_created_at_idx on public.registrations(created_at desc);
create index if not exists registrations_status_idx on public.registrations(status);
create index if not exists registrations_email_idx on public.registrations(lower(email));

create or replace function public.is_eventora_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.eventora_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_eventora_admin() from public;
grant execute on function public.is_eventora_admin() to authenticated;

alter table public.eventora_admins enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

-- SQL privileges are required in addition to RLS policies.
grant select on public.eventora_admins to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, update, delete on public.registrations to authenticated;

drop policy if exists "Admins can view their own admin record" on public.eventora_admins;
create policy "Admins can view their own admin record" on public.eventora_admins
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events" on public.events
for all to authenticated using ((select public.is_eventora_admin()))
with check ((select public.is_eventora_admin()));

drop policy if exists "Admins read registrations" on public.registrations;
create policy "Admins read registrations" on public.registrations
for select to authenticated using ((select public.is_eventora_admin()));

drop policy if exists "Admins update registrations" on public.registrations;
create policy "Admins update registrations" on public.registrations
for update to authenticated using ((select public.is_eventora_admin()))
with check ((select public.is_eventora_admin()));

drop policy if exists "Admins delete registrations" on public.registrations;
create policy "Admins delete registrations" on public.registrations
for delete to authenticated using ((select public.is_eventora_admin()));

-- No public/anon INSERT policy is enabled yet. Do not collect real participant
-- details until a protected intake endpoint and anti-spam controls are deployed.
