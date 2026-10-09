-- Structure Pro module schemas.
-- In the Supabase dashboard: SQL Editor → New query → paste this → Run.
-- Then Project Settings → Data API → Exposed schemas: add cpq, crm, and ai.
-- The app reads and writes with the service role. It does not call database functions.
-- Fresh installs run this file only. An existing database also runs migrate-to-modules.sql.
-- A database that already has cpq.quotes, crm.contacts, and crm.messages runs
-- migrate-crm-customers-activities.sql after this file.
-- If crm.activities still has a source column, run migrate-crm-activity-channel.sql.
-- If activities.channel still uses inbound_call or outbound_call, run migrate-crm-activity-call.sql.

create schema if not exists cpq;
create schema if not exists crm;
create schema if not exists ai;

create table if not exists cpq.configurations (
  id text primary key,
  selections jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists crm.quotes (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  selections jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm.deals (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references crm.quotes (id),
  source text not null check (source in ('quote', 'yard_preview')),
  status text not null default 'open' check (status in ('open', 'invoice_sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_quote_id_idx on crm.deals (quote_id);

create table if not exists crm.customers (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references crm.deals (id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  opted_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deal_id, phone)
);

create index if not exists customers_deal_id_idx on crm.customers (deal_id);

create table if not exists crm.conversations (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null unique,
  chat_id text,
  customer_id uuid not null unique references crm.customers (id) on delete cascade,
  contract_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_chat_id_idx on crm.conversations (chat_id);

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

create table if not exists crm.activities (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references crm.conversations (id) on delete cascade,
  position integer not null,
  channel text not null check (channel in (
    'call',
    'sms',
    'facebook',
    'email',
    'telegram'
  )),
  role text not null check (role in ('user', 'model')),
  body text not null,
  generated_by text not null default 'manual' check (generated_by in ('ai', 'manual')),
  call_id uuid references crm.calls (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (conversation_id, position)
);

create index if not exists activities_call_id_idx on crm.activities (call_id);

create table if not exists ai.yard_previews (
  id uuid primary key default gen_random_uuid(),
  crm_customer_id uuid not null,
  crm_deal_id uuid not null,
  status text not null default 'accepted' check (status in ('accepted', 'emailed', 'failed')),
  error text,
  events jsonb not null default '[]'::jsonb,
  yard_photo_path text,
  building_render_path text,
  preview_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'ai'
      and table_name = 'yard_previews'
      and column_name = 'shed_render_path'
  ) then
    alter table ai.yard_previews
      rename column shed_render_path to building_render_path;
  end if;
end $$;

create index if not exists yard_previews_created_at_idx
  on ai.yard_previews (created_at desc);

alter table cpq.configurations enable row level security;
alter table crm.quotes enable row level security;
alter table crm.customers enable row level security;
alter table crm.deals enable row level security;
alter table crm.conversations enable row level security;
alter table crm.calls enable row level security;
alter table crm.activities enable row level security;
alter table ai.yard_previews enable row level security;

-- No policies for anon or authenticated. The server uses the service role,
-- which bypasses RLS.

grant usage on schema cpq, crm, ai to service_role;
grant select, insert, update, delete on table cpq.configurations to service_role;
grant select, insert, update, delete on table crm.quotes to service_role;
grant select, insert, update, delete on table crm.customers to service_role;
grant select, insert, update, delete on table crm.deals to service_role;
grant select, insert, update, delete on table crm.conversations to service_role;
grant select, insert, update, delete on table crm.calls to service_role;
grant select, insert, update, delete on table crm.activities to service_role;
grant select, insert, update, delete on table ai.yard_previews to service_role;
grant usage, select on all sequences in schema crm, ai to service_role;

-- The app creates the private "yard-previews" storage bucket on the first save.
