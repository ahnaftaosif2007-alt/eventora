
-- EVENTORA public TEST mode v1. Test-only records never touch official registrations/payments.
create table if not exists public.eventora_test_registrations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  test_token uuid not null unique default gen_random_uuid(),
  division text not null check (division in ('A','B','C')),
  selected_segments text[] not null check (cardinality(selected_segments) between 1 and 8),
  test_amount numeric(10,2) not null default 100 check (test_amount = 100),
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  payment_method text,
  transaction_reference text,
  payment_status text not null default 'not_submitted' check (payment_status in ('not_submitted','submitted','verified','rejected')),
  payment_note text,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  check ((payment_status = 'not_submitted' and transaction_reference is null) or (payment_status <> 'not_submitted' and transaction_reference is not null))
);
create index if not exists eventora_test_registrations_created_idx on public.eventora_test_registrations(created_at desc);
create table if not exists public.eventora_test_audit (
  id bigint generated always as identity primary key,
  test_registration_id uuid not null references public.eventora_test_registrations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created','payment_submitted','verified','rejected','checked_in')),
  note text,
  created_at timestamptz not null default now()
);
alter table public.eventora_test_registrations enable row level security;
alter table public.eventora_test_audit enable row level security;
revoke all on public.eventora_test_registrations, public.eventora_test_audit from anon, authenticated;
grant select on public.eventora_test_registrations, public.eventora_test_audit to authenticated;
drop policy if exists "EVENTORA test records for admins" on public.eventora_test_registrations;
create policy "EVENTORA test records for admins" on public.eventora_test_registrations
for select to authenticated using ((select public.is_eventora_admin()));
drop policy if exists "EVENTORA test audit for main admin" on public.eventora_test_audit;
create policy "EVENTORA test audit for main admin" on public.eventora_test_audit
for select to authenticated using ((select public.is_eventora_main_admin()));

create or replace function public.eventora_public_test_register(p_division text, p_segments text[])
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_ref text;
  v_token uuid;
  v_ip text := coalesce((nullif(current_setting('request.headers', true), '')::jsonb->>'x-forwarded-for'), 'unknown');
  v_count integer;
begin
  if p_division not in ('A','B','C') or p_segments is null or cardinality(p_segments) not between 1 and 8 then
    raise exception 'Choose a valid division and one to eight segments.';
  end if;
  if exists (select 1 from unnest(p_segments) s where s not in ('AP Debate','Debate IQ Quiz','Movie Quiz','Mystery Case Challenge','Creative Arguments','This or That','Extempore Speech','Baroari Debate')) then
    raise exception 'Invalid test segment.';
  end if;
  if 'AP Debate' = any(p_segments) and p_division <> 'C' then raise exception 'AP Debate is Division C only.'; end if;
  select count(*) into v_count from public.eventora_test_registrations
   where reference like 'TEST-%' and created_at > now() - interval '5 minutes'
   and coalesce((select md5(v_ip)), 'unknown') = coalesce((select md5(v_ip)), 'unknown');
  if v_count >= 30 then raise exception 'Public test limit reached. Please try again later.'; end if;
  v_ref := 'TEST-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.eventora_test_registrations(reference,division,selected_segments)
  values(v_ref,p_division,p_segments) returning id,test_token into v_id,v_token;
  insert into public.eventora_test_audit(test_registration_id,action,note)
  values(v_id,'created','Public TEST registration created; no personal data collected.');
  return jsonb_build_object('success',true,'reference',v_ref,'test_token',v_token,'test_amount',100,'mode','TEST');
end;
$$;

create or replace function public.eventora_public_test_payment(p_reference text,p_payment_method text,p_transaction_reference text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if p_reference !~ '^TEST-[A-F0-9]{10}$' then raise exception 'Enter a valid TEST registration reference.'; end if;
  if p_payment_method not in ('Test bKash','Test Nagad','Test Bank') then raise exception 'Choose a test payment method.'; end if;
  if p_transaction_reference !~ '^TEST-TXN-[A-Z0-9-]{4,40}$' then raise exception 'Use a dummy reference beginning TEST-TXN-. No real transaction reference is accepted.'; end if;
  update public.eventora_test_registrations
  set payment_method=p_payment_method, transaction_reference=p_transaction_reference, payment_status='submitted'
  where reference=p_reference and payment_status in ('not_submitted','rejected')
  returning id into v_id;
  if v_id is null then raise exception 'Test registration not found or payment already submitted.'; end if;
  insert into public.eventora_test_audit(test_registration_id,action,note)
  values(v_id,'payment_submitted','Dummy test payment only; no money was transferred.');
  return jsonb_build_object('success',true,'mode','TEST','payment_status','submitted');
end;
$$;

create or replace function public.eventora_get_test_queue()
returns table(test_id uuid,reference text,test_token uuid,division text,selected_segments text[],test_amount numeric,test_status text,payment_method text,transaction_reference text,payment_status text,payment_note text,checked_in_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not (select public.eventora_can_verify_payments()) then raise exception 'Only a Payment Verifier or Main Admin can view the test payment queue.'; end if;
 return query select t.id,t.reference,t.test_token,t.division,t.selected_segments,t.test_amount,t.status,t.payment_method,t.transaction_reference,t.payment_status,t.payment_note,t.checked_in_at,t.created_at
 from public.eventora_test_registrations t order by t.created_at desc;
end;
$$;

create or replace function public.eventora_review_test_payment(p_test_id uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_note text := nullif(btrim(coalesce(p_note,'')),'');
begin
 if not (select public.eventora_can_verify_payments()) then raise exception 'Not authorised to review test payments.'; end if;
 if p_decision not in ('verified','rejected') then raise exception 'Invalid test decision.'; end if;
 if p_decision='rejected' and v_note is null then raise exception 'A reason is required when rejecting.'; end if;
 update public.eventora_test_registrations set payment_status=p_decision,payment_note=v_note,reviewed_at=now(),reviewed_by=(select auth.uid())
 where id=p_test_id and payment_status='submitted' returning id into v_id;
 if v_id is null then raise exception 'Test payment is no longer awaiting review.'; end if;
 insert into public.eventora_test_audit(test_registration_id,actor_user_id,action,note) values(v_id,(select auth.uid()),p_decision,v_note);
 return jsonb_build_object('success',true,'mode','TEST','payment_status',p_decision);
end;
$$;

create or replace function public.eventora_test_checkin(p_test_token uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_ref text;
begin
 if not (select public.is_eventora_admin()) then raise exception 'Organizer access required.'; end if;
 update public.eventora_test_registrations set checked_in_at=coalesce(checked_in_at,now())
 where test_token=p_test_token returning id,reference into v_id,v_ref;
 if v_id is null then raise exception 'Test QR/token not found.'; end if;
 insert into public.eventora_test_audit(test_registration_id,actor_user_id,action,note)
 values(v_id,(select auth.uid()),'checked_in','TEST check-in');
 return jsonb_build_object('success',true,'mode','TEST','reference',v_ref);
end;
$$;

revoke all on function public.eventora_public_test_register(text,text[]) from public;
revoke all on function public.eventora_public_test_payment(text,text,text) from public;
grant execute on function public.eventora_public_test_register(text,text[]) to anon,authenticated;
grant execute on function public.eventora_public_test_payment(text,text,text) to anon,authenticated;
revoke all on function public.eventora_get_test_queue() from public,anon;
revoke all on function public.eventora_review_test_payment(uuid,text,text) from public,anon;
revoke all on function public.eventora_test_checkin(uuid) from public,anon;
grant execute on function public.eventora_get_test_queue() to authenticated;
grant execute on function public.eventora_review_test_payment(uuid,text,text) to authenticated;
grant execute on function public.eventora_test_checkin(uuid) to authenticated;
