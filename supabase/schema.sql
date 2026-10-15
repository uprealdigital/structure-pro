-- Structure Pro module schemas.
-- In the Supabase dashboard: SQL Editor → New query → paste this → Run.
-- Then Project Settings → Data API → Exposed schemas: add cpq, crm, and ai.
-- The app reads and writes with the service role. It does not call database functions.
-- Fresh installs run this file only. An existing database also runs migrate-to-modules.sql.
-- A database that already has cpq.quotes, crm.contacts, and crm.messages runs
-- migrate-crm-customers-activities.sql after this file.
-- If crm.activities still has a source column, run migrate-crm-activity-channel.sql.
-- If activities.channel still uses inbound_call or outbound_call, run migrate-crm-activity-call.sql.
-- If crm.customers still has deal_id, run migrate-crm-customer-deals.sql.
-- If crm.deals.status still allows only open and invoice_sent, run migrate-crm-deal-status.sql.
-- If crm.deals has no previous_status, run migrate-crm-deal-previous-status.sql.
-- If crm.quotes has no active_revision_id, run migrate-crm-quote-revisions.sql.
-- If crm.conversations has one row per deal, run migrate-crm-conversation-per-customer.sql.
-- If crm.customers has no active_deal_id, run migrate-crm-conversation-active-deal.sql.
-- If any customer has no conversation, run migrate-crm-conversation-for-every-customer.sql.

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

create table if not exists crm.quote_revisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references crm.quotes (id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  status text not null default 'draft' check (status in ('draft', 'sent')),
  selections jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, revision_number)
);

create index if not exists quote_revisions_quote_id_idx on crm.quote_revisions (quote_id);

alter table crm.quotes
  add column if not exists active_revision_id uuid references crm.quote_revisions (id) on delete set null;

create table if not exists crm.deals (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references crm.quotes (id),
  source text not null check (source in ('quote', 'yard_preview')),
  status text not null default 'lead' check (status in ('lead', 'quote_sent', 'quote_viewed', 'partially_signed', 'deal_won', 'deal_lost')),
  previous_status text check (previous_status in ('lead', 'quote_sent', 'quote_viewed', 'partially_signed', 'deal_won', 'deal_lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_quote_id_idx on crm.deals (quote_id);

create table if not exists crm.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  opted_out boolean not null default false,
  active_deal_id uuid references crm.deals (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phone)
);

create table if not exists crm.deal_customers (
  customer_id uuid not null references crm.customers (id) on delete cascade,
  deal_id uuid not null references crm.deals (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (customer_id, deal_id)
);

create index if not exists deal_customers_deal_id_idx on crm.deal_customers (deal_id);

create unique index if not exists deal_customers_one_primary_idx
  on crm.deal_customers (deal_id)
  where is_primary;

create table if not exists crm.conversations (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null unique,
  channel_key text,
  chat_id text,
  customer_id uuid not null unique references crm.customers (id) on delete cascade,
  contract_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_chat_id_idx on crm.conversations (chat_id);
create index if not exists conversations_channel_key_idx on crm.conversations (channel_key);

create or replace function crm.open_customer_conversation()
returns trigger
language plpgsql
as $$
begin
  insert into crm.conversations (
    lookup_key,
    customer_id,
    contract_sent,
    created_at,
    updated_at
  )
  values (
    case
      when exists (
        select 1
        from crm.conversations
        where lookup_key = new.phone
      ) then new.id::text
      else new.phone
    end,
    new.id,
    false,
    coalesce(new.created_at, now()),
    coalesce(new.updated_at, now())
  );
  return new;
end;
$$;

drop trigger if exists customers_create_conversation on crm.customers;

create trigger customers_create_conversation
  after insert on crm.customers
  for each row
  execute function crm.open_customer_conversation();

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
alter table crm.quote_revisions enable row level security;
alter table crm.customers enable row level security;
alter table crm.deal_customers enable row level security;
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
grant select, insert, update, delete on table crm.quote_revisions to service_role;
grant select, insert, update, delete on table crm.customers to service_role;
grant select, insert, update, delete on table crm.deal_customers to service_role;
grant select, insert, update, delete on table crm.deals to service_role;
grant select, insert, update, delete on table crm.conversations to service_role;
grant select, insert, update, delete on table crm.calls to service_role;
grant select, insert, update, delete on table crm.activities to service_role;
grant select, insert, update, delete on table ai.yard_previews to service_role;
grant usage, select on all sequences in schema crm, ai to service_role;

-- The app creates the private "yard-previews" storage bucket on the first save.
