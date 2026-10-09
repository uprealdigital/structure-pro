-- Store every phone activity as channel 'call'.
-- Inbound and outbound stay on crm.calls.direction.
-- Run after migrate-crm-activity-channel.sql. Safe to run twice.

alter table crm.activities drop constraint if exists activities_channel_check;
alter table crm.activities drop constraint if exists activities_source_check;

update crm.activities
set channel = 'call'
where channel in ('inbound_call', 'outbound_call');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.activities'::regclass
      and conname = 'activities_channel_check'
  ) then
    alter table crm.activities
      add constraint activities_channel_check
      check (channel in ('call', 'sms', 'facebook', 'email', 'telegram'));
  end if;
end $$;
