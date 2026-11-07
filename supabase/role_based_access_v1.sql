-- EVENTORA role-based access control v1
-- Run AFTER schema.sql, pricing_early_bird_migration.sql,
-- registration_intake_v1.sql and registration_pricing_sync_v1.sql.
-- Existing eventora_admins users are migrated as Main Admins.

create table if not exists public.eventora_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('main_admin','payment_verifier','staff','disabled')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null
);

create table if not exists public.eventora_role_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  old_role text,
  new_role text,
  created_at timestamptz not null default now()
);

create index if not exists eventora_role_audit_created_idx
  on public.eventora_role_audit(created_at desc);

-- Preserve the existing dashboard owner(s) as Main Admins.
insert into public.eventora_user_roles(user_id, role, active)
select user_id, 'main_admin', true
from public.eventora_admins
on conflict (user_id) do nothing;

alter table public.eventora_user_roles enable row level security;
alter table public.eventora_role_audit enable row level security;
revoke all on public.eventora_user_roles from anon, authenticated;
revoke all on public.eventora_role_audit from anon, authenticated;
grant select on public.eventora_user_roles to authenticated;

create or replace function public.eventora_my_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select r.role
  from public.eventora_user_roles r
  where r.user_id = (select auth.uid()) and r.active = true
  limit 1;
$$;

create or replace function public.is_eventora_main_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.eventora_user_roles r
    where r.user_id = (select auth.uid())
      and r.active = true and r.role = 'main_admin'
  );
$$;

create or replace function public.eventora_can_verify_payments()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.eventora_user_roles r
    where r.user_id = (select auth.uid())
      and r.active = true and r.role in ('main_admin','payment_verifier')
  );
$$;

-- Keep the existing dashboard's general access check, now role-aware.
create or replace function public.is_eventora_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.eventora_user_roles r
    where r.user_id = (select auth.uid())
      and r.active = true
      and r.role in ('main_admin','payment_verifier','staff')
  );
$$;

revoke all on function public.eventora_my_role() from public;
revoke all on function public.is_eventora_main_admin() from public;
revoke all on function public.eventora_can_verify_payments() from public;
revoke all on function public.is_eventora_admin() from public;
grant execute on function public.eventora_my_role() to authenticated;
grant execute on function public.is_eventora_main_admin() to authenticated;
grant execute on function public.eventora_can_verify_payments() to authenticated;
grant execute on function public.is_eventora_admin() to authenticated;

drop policy if exists "Users can view own EVENTORA role" on public.eventora_user_roles;
create policy "Users can view own EVENTORA role"
on public.eventora_user_roles for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_eventora_main_admin()));

drop policy if exists "Main Admin can view role audit" on public.eventora_role_audit;
create policy "Main Admin can view role audit"
on public.eventora_role_audit for select to authenticated
using ((select public.is_eventora_main_admin()));

-- Role assignment is performed through this audited Main Admin-only RPC.
create or replace function public.eventora_assign_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_old_role text;
begin
  if not (select public.is_eventora_main_admin()) then
    raise exception 'Only the Main Admin can manage staff access.';
  end if;
  if p_user_id is null or p_role not in ('payment_verifier','staff','disabled') then
    raise exception 'Choose a valid user and a permitted staff role.';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'The Main Admin cannot change their own role here.';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'No Auth account exists for this user ID.';
  end if;

  select role into v_old_role
  from public.eventora_user_roles where user_id = p_user_id;

  insert into public.eventora_user_roles(user_id, role, active, assigned_by, updated_at)
  values (p_user_id, p_role, p_role <> 'disabled', (select auth.uid()), now())
  on conflict (user_id) do update
    set role = excluded.role,
        active = excluded.active,
        assigned_by = excluded.assigned_by,
        updated_at = now();

  insert into public.eventora_role_audit(actor_user_id,target_user_id,action,old_role,new_role)
  values ((select auth.uid()),p_user_id,'role_assignment',v_old_role,p_role);
end;
$$;

revoke all on function public.eventora_assign_role(uuid,text) from public;
grant execute on function public.eventora_assign_role(uuid,text) to authenticated;

-- Main Admin alone controls events, registration decisions and pricing.
drop policy if exists "Admins manage events" on public.events;
create policy "Main Admin manages events" on public.events
for all to authenticated
using ((select public.is_eventora_main_admin()))
with check ((select public.is_eventora_main_admin()));

drop policy if exists "Admins update EVENTORA settings" on public.eventora_settings;
create policy "Main Admin updates EVENTORA settings" on public.eventora_settings
for update to authenticated
using ((select public.is_eventora_main_admin()))
with check ((select public.is_eventora_main_admin()));

drop policy if exists "Admins manage segment prices" on public.event_segment_prices;
create policy "Main Admin manages segment prices" on public.event_segment_prices
for all to authenticated
using ((select public.is_eventora_main_admin()))
with check ((select public.is_eventora_main_admin()));

drop policy if exists "Admins update registrations" on public.registrations;
create policy "Main Admin updates registrations" on public.registrations
for update to authenticated
using ((select public.is_eventora_main_admin()))
with check ((select public.is_eventora_main_admin()));

drop policy if exists "Admins delete registrations" on public.registrations;
create policy "Main Admin deletes registrations" on public.registrations
for delete to authenticated
using ((select public.is_eventora_main_admin()));

-- All active dashboard roles can read participant records.
drop policy if exists "Admins read registrations" on public.registrations;
create policy "Dashboard staff read registrations" on public.registrations
for select to authenticated
using ((select public.is_eventora_admin()));

-- Pricing tables remain visible in read-only mode to dashboard staff.
drop policy if exists "Admins read EVENTORA settings" on public.eventora_settings;
create policy "Dashboard staff read EVENTORA settings" on public.eventora_settings
for select to authenticated
using ((select public.is_eventora_admin()));
