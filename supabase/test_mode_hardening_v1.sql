-- EVENTORA Public Test Mode hardening v1
-- Isolated TEST-only records. No writes to official registrations/payment tables.

create unique index if not exists eventora_test_transaction_reference_uidx
  on public.eventora_test_registrations (lower(transaction_reference))
  where transaction_reference is not null;

create or replace function public.eventora_public_test_register(
  p_division text,
  p_segments text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id uuid;
  v_ref text;
  v_token uuid;
  v_count integer;
begin
  if p_division not in ('A','B','C')
     or p_segments is null
     or cardinality(p_segments) not between 1 and 8 then
    raise exception 'Choose a valid division and one to eight segments.';
  end if;
  if cardinality(p_segments) <> (
    select count(distinct s) from unnest(p_segments) s
  ) then
    raise exception 'Duplicate segments are not allowed.';
  end if;
  if exists (
    select 1 from unnest(p_segments) s
    where s not in (
      'AP Debate','Debate IQ Quiz','Movie Quiz','Mystery Case Challenge',
      'Creative Arguments','This or That','Extempore Speech','Baroari Debate'
    )
  ) then
    raise exception 'Invalid test segment.';
  end if;
  if 'AP Debate' = any(p_segments) and p_division <> 'C' then
    raise exception 'AP Debate is Division C only.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('eventora_public_test_register')
  );
  select count(*) into v_count
  from public.eventora_test_registrations
  where created_at > now() - interval '5 minutes';
  if v_count >= 30 then
    raise exception 'Public test limit reached. Please try again in a few minutes.';
  end if;
  select count(*) into v_count from public.eventora_test_registrations;
  if v_count >= 1000 then
    raise exception 'The test environment has reached its record limit.';
  end if;

  v_ref := 'TEST-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,10));
  insert into public.eventora_test_registrations(reference,division,selected_segments)
  values(v_ref,p_division,p_segments)
  returning id,test_token into v_id,v_token;

  insert into public.eventora_test_audit(test_registration_id,action,note)
  values(v_id,'created','Public TEST registration created; no personal data collected.');

  return pg_catalog.jsonb_build_object(
    'success',true,'reference',v_ref,'test_token',v_token,
    'test_amount',100,'mode','TEST'
  );
end;
$function$;

revoke all on function public.eventora_public_test_register(text,text[]) from public;
grant execute on function public.eventora_public_test_register(text,text[]) to anon, authenticated;
revoke all on function public.eventora_public_test_payment(text,text,text) from public;
grant execute on function public.eventora_public_test_payment(text,text,text) to anon, authenticated;
revoke all on function public.eventora_get_test_queue() from public, anon;
grant execute on function public.eventora_get_test_queue() to authenticated;
revoke all on function public.eventora_review_test_payment(uuid,text,text) from public, anon;
grant execute on function public.eventora_review_test_payment(uuid,text,text) to authenticated;
revoke all on function public.eventora_test_checkin(uuid) from public, anon;
grant execute on function public.eventora_test_checkin(uuid) to authenticated;
