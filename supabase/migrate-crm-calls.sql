-- Move call details off crm.activities onto crm.calls.
-- Run after supabase/schema.sql. Skip this on a brand-new database that
-- already created crm.calls from the current schema.sql.
-- Safe to run twice.

create table if not exists crm.calls (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('inbound', 'outbound')),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  script_match integer check (script_match is null or script_match between 0 and 100),
  recording_url text,
  transcript text,
  external_id text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table crm.activities add column if not exists call_id uuid;

-- Each existing call activity gets its own call row.
do $$
declare
  activity_row record;
  new_call_id uuid;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'crm'
      and table_name = 'activities'
      and column_name = 'duration_seconds'
  ) then
    return;
  end if;

  for activity_row in
    execute $q$
      select id, source, duration_seconds, script_match, body, created_at
      from crm.activities
      where call_id is null
        and source in ('inbound_call', 'outbound_call')
    $q$
  loop
    insert into crm.calls (
      direction,
      duration_seconds,
      script_match,
      transcript,
      started_at,
      ended_at,
      created_at,
      updated_at
    )
    values (
      case when activity_row.source = 'outbound_call' then 'outbound' else 'inbound' end,
      activity_row.duration_seconds,
      activity_row.script_match,
      nullif(activity_row.body, ''),
      activity_row.created_at,
      case
        when activity_row.duration_seconds is null then null
        else activity_row.created_at + make_interval(secs => activity_row.duration_seconds)
      end,
      activity_row.created_at,
      activity_row.created_at
    )
    returning id into new_call_id;

    update crm.activities
    set call_id = new_call_id
    where id = activity_row.id;
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.activities'::regclass
      and conname = 'activities_call_id_fkey'
  ) then
    alter table crm.activities
      add constraint activities_call_id_fkey
      foreign key (call_id) references crm.calls (id) on delete set null;
  end if;
end $$;

create index if not exists activities_call_id_idx on crm.activities (call_id);

alter table crm.activities drop constraint if exists activities_duration_seconds_check;
alter table crm.activities drop constraint if exists activities_script_match_check;
alter table crm.activities drop column if exists duration_seconds;
alter table crm.activities drop column if exists script_match;

alter table crm.calls enable row level security;
grant select, insert, update, delete on table crm.calls to service_role;
