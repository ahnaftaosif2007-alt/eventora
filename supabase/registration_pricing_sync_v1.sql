-- EVENTORA: keep the secure intake price table in sync with the existing
-- admin-facing event_segment_prices table.
-- Run after registration_intake_v1.sql.
-- event_segment_prices remains the source of truth; grouped labels such as
-- "Debate IQ Quiz / Movie Quiz" are expanded into individual segment rows.

create or replace function public.sync_eventora_registration_segment_prices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_segment text;
begin
  if tg_op = 'DELETE' then
    for v_segment in
      select pg_catalog.btrim(x)
      from pg_catalog.regexp_split_to_table(old.segment, '\\s*/\\s*') as x
    loop
      delete from public.eventora_registration_segment_prices
      where segment = v_segment and division = old.division;
    end loop;
    return old;
  end if;

  for v_segment in
    select pg_catalog.btrim(x)
    from pg_catalog.regexp_split_to_table(new.segment, '\\s*/\\s*') as x
  loop
    insert into public.eventora_registration_segment_prices(segment, division, price)
    values (v_segment, new.division, new.price)
    on conflict (segment, division)
    do update set price = excluded.price;
  end loop;

  return new;
end;
$$;

drop trigger if exists sync_eventora_registration_prices
on public.event_segment_prices;

create trigger sync_eventora_registration_prices
after insert or update of segment, division, price or delete
on public.event_segment_prices
for each row
execute function public.sync_eventora_registration_segment_prices();

-- Initial reconciliation: existing admin-facing prices overwrite intake prices.
insert into public.eventora_registration_segment_prices(segment, division, price)
select pg_catalog.btrim(parts.segment), p.division, p.price
from public.event_segment_prices p
cross join lateral pg_catalog.regexp_split_to_table(p.segment, '\\s*/\\s*') as parts(segment)
on conflict (segment, division)
do update set price = excluded.price;
