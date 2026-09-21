-- Quote storage for Structure Pro.
-- In the Supabase dashboard: SQL Editor → New query → paste this → Run.
-- Then open Table Editor to see quotes and quote_messages.
-- The app reads and writes these tables with the Supabase client.
-- It does not call database functions.

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null unique,
  full_name text not null,
  phone text not null,
  email text not null,
  chat_id text,
  selections jsonb not null,
  invoice_id text not null,
  contract_sent boolean not null default false,
  opted_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_messages (
  id bigint generated always as identity primary key,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  position integer not null,
  role text not null check (role in ('user', 'model')),
  body text not null,
  created_at timestamptz not null default now(),
  unique (quote_id, position)
);

create index if not exists quotes_phone_idx on public.quotes (phone);
create index if not exists quotes_email_idx on public.quotes (email);

alter table public.quotes enable row level security;
alter table public.quote_messages enable row level security;

-- No policies for anon or authenticated. The server uses the service role,
-- which bypasses RLS. The Table Editor still shows every row.

grant select, insert, update, delete on table public.quotes to service_role;
grant select, insert, update, delete on table public.quote_messages to service_role;
grant usage, select on all sequences in schema public to service_role;
