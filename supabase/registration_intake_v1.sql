-- EVENTORA secure registration intake v1
-- Run AFTER schema.sql and pricing_early_bird_migration.sql.
-- This migration adds structured registration details and a server-side
-- submission RPC. It does NOT make the current public form live by itself.

create table if not exists public.eventora_registration_segment_prices (
  segment text not null,
  division text not null check (division in ('A','B','C')),
  price numeric(10,2) not null check (price >= 0),
  primary key (segment, division)
);

insert into public.eventora_registration_segment_prices (segment, division, price) values
  ('AP Debate','C',1200),
  ('Debate IQ Quiz','A',50), ('Debate IQ Quiz','B',70), ('Debate IQ Quiz','C',70),
  ('Movie Quiz','A',50), ('Movie Quiz','B',70), ('Movie Quiz','C',70),
  ('Mystery Case Challenge','A',140), ('Mystery Case Challenge','B',200), ('Mystery Case Challenge','C',200),
  ('Creative Arguments','A',70), ('Creative Arguments','B',100), ('Creative Arguments','C',100),
  ('This or That','A',70), ('This or That','B',100), ('This or That','C',100),
  ('Extempore Speech','A',100), ('Extempore Speech','B',150), ('Extempore Speech','C',150),
  ('Baroari Debate','A',100), ('Baroari Debate','B',150), ('Baroari Debate','C',150)
on conflict (segment, division) do update set price = excluded.price;

alter table public.registrations
  add column if not exists division text,
  add column if not exists selected_segments text[] not null default '{}',
  add column if not exists registration_data jsonb not null default '{}'::jsonb,
  add column if not exists fee_subtotal numeric(10,2) not null default 0,
  add column if not exists discount_type text not null default 'none',
  add column if not exists discount_rate numeric(5,2) not null default 0,
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists total_payable numeric(10,2) not null default 0,
  add column if not exists drive_archive_status text not null default 'not_configured'
    check (drive_archive_status in ('not_configured','pending','saved','failed'));

alter table public.eventora_registration_segment_prices enable row level security;
revoke all on public.eventora_registration_segment_prices from anon, authenticated;
grant select on public.eventora_registration_segment_prices to anon, authenticated;

drop policy if exists "Public can view registration segment prices" on public.eventora_registration_segment_prices;
create policy "Public can view registration segment prices"
on public.eventora_registration_segment_prices
for select to anon, authenticated using (true);

-- No direct table INSERT is granted to anon. All public submissions go through
-- this validating function; registrations remain readable only by admins.
revoke insert on public.registrations from anon, authenticated;

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

  v_early_bird := public.is_early_bird_active();
  for v_segment in select pg_catalog.unnest(v_segments)
  loop
    select p.price into v_base
    from public.eventora_registration_segment_prices p
    where p.segment = v_segment and p.division = v_division;
    if v_base is null then
      raise exception 'The selected segment is not available for this division: %', v_segment;
    end if;
    v_subtotal := v_subtotal + v_base;

    if v_early_bird then
      v_discount_rate := 20;
    else
      v_member_eligible := (v_club in ('boys','girls'));
      if v_segment = 'AP Debate' then
        v_member_eligible := v_member_eligible or v_member2_club in ('boys','girls')
          or v_member3_club in ('boys','girls');
      elsif v_segment = 'Mystery Case Challenge' then
        v_member_eligible := v_member_eligible or v_mystery_club in ('boys','girls');
      end if;
      v_discount_rate := case when v_member_eligible then 15 else 0 end;
    end if;
    v_total := v_total + pg_catalog.round(v_base * (1 - v_discount_rate / 100));
  end loop;

  v_discount := v_subtotal - v_total;
  v_discount_type := case when v_early_bird then 'early_bird'
                          when v_discount > 0 then 'club_member'
                          else 'none' end;

  insert into public.registrations (
    event_name, participant_name, email, institution, team_name, division,
    selected_segments, registration_data, fee_subtotal, discount_type,
    discount_rate, discount_amount, total_payable, drive_archive_status
  ) values (
    'The Inter-Wing Collegiate Debate Championship',
    v_name, v_email, v_institution,
    nullif(pg_catalog.btrim(coalesce(v_data->>'teamName','')), ''),
    v_division, v_segments, p_payload, v_subtotal, v_discount_type,
    case when v_early_bird then 20 else case when v_discount > 0 then 15 else 0 end end,
    v_discount, v_total, 'not_configured'
  )
  returning id, reference into v_registration_id, v_reference;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'id', v_registration_id,
    'reference', v_reference,
    'subtotal', v_subtotal,
    'discount_type', v_discount_type,
    'discount_amount', v_discount,
    'total_payable', v_total,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.submit_eventora_registration(jsonb) from public;
grant execute on function public.submit_eventora_registration(jsonb) to anon, authenticated;

-- Admins can see the new columns through the existing registrations RLS policy.
-- No public SELECT policy is added.
