-- EVENTORA pricing + consent correction
-- Run in Supabase SQL Editor after the existing registration intake and pricing settings migrations.
-- Public registration remains disabled in script.js.

alter table public.registrations
  add column if not exists membership_fee numeric(10,2) not null default 0;

create or replace function public.get_eventora_public_pricing()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'membership_fee', coalesce(s.membership_fee, 100),
    'club_member_discount', coalesce(s.club_member_discount, 15),
    'early_bird_discount', coalesce(s.early_bird_discount, 20),
    'early_bird_active', (s.early_bird_deadline is not null and now() < s.early_bird_deadline)
  )
  from public.eventora_settings s where s.id = 1;
$$;
revoke all on function public.get_eventora_public_pricing() from public;
grant execute on function public.get_eventora_public_pricing() to anon, authenticated;

create or replace function public.submit_eventora_registration(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_email text;
  v_institution text;
  v_division text;
  v_club text;
  v_segments text[];
  v_data jsonb;
  v_segment text;
  v_base numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_discount_rate numeric(5,2) := 0;
  v_discount_type text := 'none';
  v_discount numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
  v_member_eligible boolean := false;
  v_early_bird boolean := false;
  v_reference text;
  v_registration_id uuid;
  v_member2_club text;
  v_member3_club text;
  v_mystery_club text;
  v_membership_fee numeric(10,2) := 100;
  v_club_discount_rate numeric(5,2) := 15;
  v_early_bird_discount_rate numeric(5,2) := 20;
begin
  if p_payload is null or pg_catalog.octet_length(p_payload::text) > 12000 then
    raise exception 'Invalid registration payload.';
  end if;

  v_name := pg_catalog.btrim(coalesce(p_payload->>'name',''));
  v_email := pg_catalog.lower(pg_catalog.btrim(coalesce(p_payload->>'email','')));
  v_institution := pg_catalog.btrim(coalesce(p_payload->>'institution',''));
  v_division := coalesce(p_payload->>'division','');
  v_club := coalesce(p_payload->>'club','none');
  v_data := coalesce(p_payload->'team','{}'::jsonb);
  v_member2_club := coalesce(v_data->>'member2Club','none');
  v_member3_club := coalesce(v_data->>'member3Club','none');
  v_mystery_club := coalesce(v_data->>'mysteryMateClub','none');

  if coalesce((p_payload->>'consent')::boolean, false) is not true then
    raise exception 'Please confirm the registration data consent.';
  end if;
  if pg_catalog.length(v_name) < 2 or pg_catalog.length(v_name) > 120 then
    raise exception 'Enter a valid full name.';
  end if;
  if v_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Enter a valid email address.';
  end if;
  if pg_catalog.length(v_institution) < 2 or pg_catalog.length(v_institution) > 180 then
    raise exception 'Enter a valid school or college name.';
  end if;
  if v_division not in ('A','B','C') then
    raise exception 'Select a valid division.';
  end if;
  if v_club not in ('none','boys','girls') then
    raise exception 'Select a valid club membership option.';
  end if;
  if jsonb_typeof(p_payload->'segments') <> 'array' then
    raise exception 'Select at least one segment.';
  end if;

  select pg_catalog.array_agg(x.value)
    into v_segments
    from (
      select distinct value
      from jsonb_array_elements_text(p_payload->'segments') as e(value)
    ) x;

  if v_segments is null or pg_catalog.cardinality(v_segments) = 0 or pg_catalog.cardinality(v_segments) > 8 then
    raise exception 'Select between one and eight valid segments.';
  end if;
  if exists (
    select 1 from pg_catalog.unnest(v_segments) s
    where s not in ('AP Debate','Debate IQ Quiz','Movie Quiz','Mystery Case Challenge',
                    'Creative Arguments','This or That','Extempore Speech','Baroari Debate')
  ) then
    raise exception 'One or more selected segments are invalid.';
  end if;
  if 'AP Debate' = any(v_segments) and v_division <> 'C' then
    raise exception 'AP Debate is available only in Division C.';
  end if;

  if 'AP Debate' = any(v_segments) then
    if pg_catalog.length(pg_catalog.btrim(coalesce(v_data->>'teamName',''))) < 2
       or pg_catalog.length(pg_catalog.btrim(coalesce(v_data->>'member2',''))) < 2
       or pg_catalog.length(pg_catalog.btrim(coalesce(v_data->>'member3',''))) < 2
       or pg_catalog.length(pg_catalog.btrim(coalesce(v_data->>'member2Institution',''))) < 2
       or pg_catalog.length(pg_catalog.btrim(coalesce(v_data->>'member3Institution',''))) < 2
       or v_member2_club not in ('none','boys','girls')
       or v_member3_club not in ('none','boys','girls') then
      raise exception 'Complete all three AP Debate team members and their club selections.';
    end if;
  end if;

  if 'Mystery Case Challenge' = any(v_segments) then
    if pg_catalog.length(pg_catalog.btrim(coalesce(v_data->>'mysteryMate',''))) < 2
       or v_mystery_club not in ('none','boys','girls') then
      raise exception 'Enter the Mystery Case teammate name and club selection.';
    end if;
  end if;

  -- Basic abuse controls: limit repeated submissions by the same email.
  if exists (
    select 1 from public.registrations r
    where pg_catalog.lower(r.email) = v_email
      and r.created_at > now() - interval '60 seconds'
  ) then
    raise exception 'A registration was just submitted with this email. Please wait before trying again.';
  end if;
  if (select pg_catalog.count(*) from public.registrations r
      where pg_catalog.lower(r.email) = v_email
        and r.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'The daily submission limit for this email has been reached.';
  end if;

  -- Membership is optional and is charged once only when the primary registrant
  -- explicitly selects one of the two clubs. Teammate selections can affect discount
  -- eligibility, but do not independently add another membership fee.
  select case when v_club in ('boys','girls') then coalesce(s.membership_fee, 100) else 0 end,
         coalesce(s.club_member_discount, 15),
         coalesce(s.early_bird_discount, 20)
    into v_membership_fee, v_club_discount_rate, v_early_bird_discount_rate
    from public.eventora_settings s where s.id = 1;
  if v_membership_fee is null or v_membership_fee < 0 then
    raise exception 'Membership fee settings are invalid.';
  end if;
  if v_club_discount_rate is null or v_club_discount_rate < 0 or v_club_discount_rate > 100
     or v_early_bird_discount_rate is null or v_early_bird_discount_rate < 0 or v_early_bird_discount_rate > 100 then
    raise exception 'Discount settings are invalid.';
  end if;

  v_early_bird := public.is_early_bird_active();
  v_member_eligible := v_club in ('boys','girls');
  if 'AP Debate' = any(v_segments) then
    v_member_eligible := v_member_eligible or v_member2_club in ('boys','girls')
      or v_member3_club in ('boys','girls');
  end if;
  if 'Mystery Case Challenge' = any(v_segments) then
    v_member_eligible := v_member_eligible or v_mystery_club in ('boys','girls');
  end if;

  for v_segment in select pg_catalog.unnest(v_segments)
  loop
    select p.price into v_base from public.eventora_registration_segment_prices p
    where p.segment = v_segment and p.division = v_division;
    if v_base is null then
      raise exception 'The selected segment is not available for this division: %', v_segment;
    end if;
    v_subtotal := v_subtotal + v_base;
  end loop;

  v_subtotal := v_subtotal + v_membership_fee;
  v_discount_rate := case when v_early_bird then v_early_bird_discount_rate
                          when v_member_eligible then v_club_discount_rate else 0 end;
  v_discount_type := case when v_early_bird then 'early_bird'
                          when v_member_eligible and v_discount_rate > 0 then 'club_member'
                          else 'none' end;
  v_discount := pg_catalog.round(v_subtotal * v_discount_rate / 100);
  v_total := v_subtotal - v_discount;

  insert into public.registrations (
    event_name, participant_name, email, institution, team_name, division,
    selected_segments, registration_data, membership_fee, fee_subtotal, discount_type,
    discount_rate, discount_amount, total_payable, drive_archive_status
  ) values (
    'The Inter-Wing Collegiate Debate Championship',
    v_name, v_email, v_institution,
    nullif(pg_catalog.btrim(coalesce(v_data->>'teamName','')), ''),
    v_division, v_segments, p_payload, v_membership_fee, v_subtotal, v_discount_type,
    v_discount_rate, v_discount, v_total, 'not_configured'
  )
  returning id, reference into v_registration_id, v_reference;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'id', v_registration_id,
    'reference', v_reference,
    'membership_fee', v_membership_fee,
    'subtotal', v_subtotal,
    'discount_rate', v_discount_rate,
    'discount_type', v_discount_type,
    'discount_amount', v_discount,
    'total_payable', v_total,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.submit_eventora_registration(jsonb) from public;
grant execute on function public.submit_eventora_registration(jsonb) to anon, authenticated;

