-- Rename crm.activities.source to channel.
-- Run on a database that already has activities.source. Safe to run twice.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'crm'
      and table_name = 'activities'
      and column_name = 'source'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'crm'
      and table_name = 'activities'
      and column_name = 'channel'
  ) then
    alter table crm.activities rename column source to channel;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.activities'::regclass
      and conname = 'activities_source_check'
  ) then
    alter table crm.activities
      rename constraint activities_source_check to activities_channel_check;
  end if;
end $$;
