-- Structure Pro module schemas.
-- In the Supabase dashboard: SQL Editor → New query → paste this → Run.
-- Then Project Settings → Data API → Exposed schemas: add cpq, crm, and ai.
-- The app reads and writes with the service role. It does not call database functions.
-- Fresh installs run this file only. An existing database also runs migrate-to-modules.sql.

create schema if not exists cpq;
create schema if not exists crm;
create schema if not exists ai;

create table if not exists cpq.configurations (
  id text primary key,
  selections jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists cpq.quotes (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  selections jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  email text not null,
  opted_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm.deals (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references crm.contacts (id) on delete cascade,
  cpq_quote_id uuid not null,
  source text not null check (source in ('quote', 'yard_preview')),
  status text not null default 'open' check (status in ('open', 'invoice_sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_contact_id_idx on crm.deals (contact_id);
create index if not exists deals_cpq_quote_id_idx on crm.deals (cpq_quote_id);

-- An earlier version stored these in ai. Move them before creating the crm copies.
do $$
begin
  if to_regclass('ai.conversations') is not null
     and to_regclass('crm.conversations') is null then
    alter table ai.conversations set schema crm;
  end if;
  if to_regclass('ai.messages') is not null
     and to_regclass('crm.messages') is null then
    alter table ai.messages set schema crm;
  end if;
end $$;

create table if not exists crm.conversations (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null unique,
  chat_id text,
  crm_deal_id uuid not null references crm.deals (id) on delete cascade,
  cpq_quote_id uuid not null,
  contract_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_chat_id_idx on crm.conversations (chat_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.conversations'::regclass
      and conname = 'conversations_crm_deal_id_fkey'
  ) then
    alter table crm.conversations
      add constraint conversations_crm_deal_id_fkey
      foreign key (crm_deal_id) references crm.deals (id) on delete cascade;
  end if;
end $$;

create table if not exists crm.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references crm.conversations (id) on delete cascade,
  position integer not null,
  role text not null check (role in ('user', 'model')),
  body text not null,
  created_at timestamptz not null default now(),
  unique (conversation_id, position)
);

create table if not exists ai.yard_previews (
  id uuid primary key default gen_random_uuid(),
  crm_contact_id uuid not null,
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
alter table cpq.quotes enable row level security;
alter table crm.contacts enable row level security;
alter table crm.deals enable row level security;
alter table crm.conversations enable row level security;
alter table crm.messages enable row level security;
alter table ai.yard_previews enable row level security;

-- No policies for anon or authenticated. The server uses the service role,
-- which bypasses RLS.

grant usage on schema cpq, crm, ai to service_role;
grant select, insert, update, delete on table cpq.configurations to service_role;
grant select, insert, update, delete on table cpq.quotes to service_role;
grant select, insert, update, delete on table crm.contacts to service_role;
grant select, insert, update, delete on table crm.deals to service_role;
grant select, insert, update, delete on table crm.conversations to service_role;
grant select, insert, update, delete on table crm.messages to service_role;
grant select, insert, update, delete on table ai.yard_previews to service_role;
grant usage, select on all sequences in schema crm, ai to service_role;

-- The app creates the private "yard-previews" storage bucket on the first save.
