-- Mark each activity as written by the AI or by a person.
-- Run after supabase/schema.sql. Safe to run twice.

alter table crm.activities add column if not exists generated_by text;

update crm.activities
set generated_by = case
  when role = 'model' and source in ('sms', 'telegram') then 'ai'
  else 'manual'
end
where generated_by is null;

alter table crm.activities alter column generated_by set default 'manual';

update crm.activities set generated_by = 'manual' where generated_by is null;

alter table crm.activities alter column generated_by set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.activities'::regclass
      and conname = 'activities_generated_by_check'
  ) then
    alter table crm.activities
      add constraint activities_generated_by_check
      check (generated_by in ('ai', 'manual'));
  end if;
end $$;
