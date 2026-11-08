-- EVENTORA payment verification v1
-- Run in Supabase SQL Editor after the existing EVENTORA role-based access setup.
-- This creates a private payment queue for manual transaction-reference review.
-- It does NOT enable public payment submissions or open registration.
-- No PINs, OTPs, passwords, full card details, or payment screenshots are collected.

create table if not exists public.eventora_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique
    references public.registrations(id) on delete cascade,
  payment_method text not null
    check (char_length(btrim(payment_method)) between 2 and 40),
  transaction_reference text not null
    check (char_length(btrim(transaction_reference)) between 4 and 100),
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'submitted'
    check (status in ('submitted','verified','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_note text
    check (reviewer_note is null or char_length(reviewer_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists eventora_payment_status_submitted_idx
  on public.eventora_payment_submissions(status, submitted_at desc);

create unique index if not exists eventora_payment_transaction_reference_uidx
  on public.eventora_payment_submissions (lower(transaction_reference));

create table if not exists public.eventora_payment_audit (
  id bigint generated always as identity primary key,
  submission_id uuid not null
    references public.eventora_payment_submissions(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('submitted','verified','rejected')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists eventora_payment_audit_submission_idx
  on public.eventora_payment_audit(submission_id, created_at desc);

alter table public.eventora_payment_submissions enable row level security;
alter table public.eventora_payment_audit enable row level security;

revoke all on public.eventora_payment_submissions from anon, authenticated;
revoke all on public.eventora_payment_audit from anon, authenticated;
grant select on public.eventora_payment_submissions to authenticated;
grant select on public.eventora_payment_audit to authenticated;

drop policy if exists "Payment verifiers read payment submissions"
  on public.eventora_payment_submissions;
create policy "Payment verifiers read payment submissions"
on public.eventora_payment_submissions
for select to authenticated
using ((select public.eventora_can_verify_payments()));

drop policy if exists "Main Admin reads payment audit"
  on public.eventora_payment_audit;
create policy "Main Admin reads payment audit"
on public.eventora_payment_audit
for select to authenticated
using ((select public.is_eventora_main_admin()));

-- Participants will submit only a payment method, transaction reference and amount.
-- This RPC is intentionally NOT executable by anon/authenticated yet. Enable it
-- only after the public registration/payment flow is approved and tested.
create or replace function public.submit_eventora_payment(
  p_reference text,
  p_email text,
  p_payment_method text,
  p_transaction_reference text,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_registration_id uuid;
  v_expected_amount numeric(10,2);
  v_registration_status text;
  v_submission_id uuid;
begin
  if p_reference is null or p_email is null
     or p_payment_method is null or p_transaction_reference is null
     or p_amount is null then
    raise exception 'Enter the required payment details.';
  end if;

  if pg_catalog.length(pg_catalog.btrim(p_payment_method)) not between 2 and 40
     or pg_catalog.length(pg_catalog.btrim(p_transaction_reference)) not between 4 and 100
     or p_amount <= 0 then
    raise exception 'Invalid payment details.';
  end if;

  select r.id, r.total_payable, r.status
    into v_registration_id, v_expected_amount, v_registration_status
  from public.registrations r
  where r.reference = pg_catalog.btrim(p_reference)
    and pg_catalog.lower(r.email) = pg_catalog.lower(pg_catalog.btrim(p_email))
  for update;

  if v_registration_id is null then
    raise exception 'The registration details could not be matched.';
  end if;

  if v_registration_status <> 'pending' then
    raise exception 'Payment details can only be submitted for a pending registration.';
  end if;

  if p_amount <> v_expected_amount then
    raise exception 'The amount does not match the registration total.';
  end if;

  insert into public.eventora_payment_submissions (
    registration_id, payment_method, transaction_reference, amount
  ) values (
    v_registration_id,
    pg_catalog.btrim(p_payment_method),
    pg_catalog.btrim(p_transaction_reference),
    p_amount
  )
  on conflict (registration_id) do update
    set payment_method = excluded.payment_method,
        transaction_reference = excluded.transaction_reference,
        amount = excluded.amount,
        status = 'submitted',
        submitted_at = now(),
        reviewed_at = null,
        reviewed_by = null,
        reviewer_note = null,
        updated_at = now()
    where public.eventora_payment_submissions.status = 'rejected'
  returning id into v_submission_id;

  if v_submission_id is null then
    raise exception 'A payment submission already exists for this registration.';
  end if;

  insert into public.eventora_payment_audit(submission_id, actor_user_id, action)
  values (v_submission_id, null, 'submitted');

  return pg_catalog.jsonb_build_object('success', true, 'status', 'submitted');
exception
  when unique_violation then
    raise exception 'This transaction reference has already been submitted.';
end;
$function$;

-- Private review queue: exposes only the minimum fields needed for payment review.
create or replace function public.eventora_get_payment_queue()
returns table (
  submission_id uuid,
  registration_reference text,
  participant_name text,
  event_name text,
  total_payable numeric,
  payment_method text,
  transaction_reference text,
  amount numeric,
  payment_status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_note text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not (select public.eventora_can_verify_payments()) then
    raise exception 'You are not authorised to review payments.';
  end if;

  return query
  select
    p.id,
    r.reference,
    r.participant_name,
    r.event_name,
    r.total_payable,
    p.payment_method,
    p.transaction_reference,
    p.amount,
    p.status,
    p.submitted_at,
    p.reviewed_at,
    p.reviewer_note
  from public.eventora_payment_submissions p
  join public.registrations r on r.id = p.registration_id
  order by
    case when p.status = 'submitted' then 0 else 1 end,
    p.submitted_at desc;
end;
$function$;

create or replace function public.eventora_review_payment(
  p_submission_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_updated_id uuid;
  v_note text := nullif(pg_catalog.btrim(coalesce(p_note, '')), '');
begin
  if not (select public.eventora_can_verify_payments()) then
    raise exception 'Only an authorised Payment Verifier or Main Admin can review payments.';
  end if;

  if p_submission_id is null or p_decision not in ('verified','rejected') then
    raise exception 'Choose a valid payment decision.';
  end if;

  if p_decision = 'rejected' and v_note is null then
    raise exception 'Add a short reason when rejecting a payment.';
  end if;

  if v_note is not null and pg_catalog.length(v_note) > 500 then
    raise exception 'The review note is too long.';
  end if;

  update public.eventora_payment_submissions
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = (select auth.uid()),
      reviewer_note = v_note,
      updated_at = now()
  where id = p_submission_id
    and status = 'submitted'
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'This payment is no longer awaiting review.';
  end if;

  insert into public.eventora_payment_audit(
    submission_id, actor_user_id, action, note
  ) values (
    v_updated_id, (select auth.uid()), p_decision, v_note
  );

  return pg_catalog.jsonb_build_object('success', true, 'status', p_decision);
end;
$function$;

-- Never expose the participant submission RPC until the event/payment flow is approved.
revoke all on function public.submit_eventora_payment(text,text,text,text,numeric)
  from public, anon, authenticated;
grant execute on function public.eventora_get_payment_queue() to authenticated;
grant execute on function public.eventora_review_payment(uuid,text,text) to authenticated;
revoke all on function public.eventora_get_payment_queue() from public, anon;
revoke all on function public.eventora_review_payment(uuid,text,text) from public, anon;

-- No direct INSERT/UPDATE/DELETE grants are provided on payment tables.
-- All review actions go through the role-checked RPC and are recorded in the audit table.
