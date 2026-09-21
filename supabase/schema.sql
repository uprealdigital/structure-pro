-- Quote storage for Structure Pro.
-- In the Supabase dashboard: SQL Editor → New query → paste this → Run.
-- Then open Table Editor to see quotes and quote_messages.

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

create or replace function public.save_quote_session(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quote_uuid uuid;
  messages jsonb;
  msg jsonb;
  i integer;
begin
  insert into public.quotes (
    lookup_key,
    full_name,
    phone,
    email,
    chat_id,
    selections,
    invoice_id,
    contract_sent,
    opted_out
  ) values (
    payload->>'lookup_key',
    payload->>'full_name',
    payload->>'phone',
    payload->>'email',
    nullif(payload->>'chat_id', ''),
    payload->'selections',
    payload->>'invoice_id',
    coalesce((payload->>'contract_sent')::boolean, false),
    coalesce((payload->>'opted_out')::boolean, false)
  )
  on conflict (lookup_key) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    chat_id = excluded.chat_id,
    selections = excluded.selections,
    invoice_id = excluded.invoice_id,
    contract_sent = excluded.contract_sent,
    opted_out = excluded.opted_out,
    updated_at = now()
  returning id into quote_uuid;

  delete from public.quote_messages where quote_id = quote_uuid;

  messages := coalesce(payload->'messages', '[]'::jsonb);
  for i in 0 .. jsonb_array_length(messages) - 1 loop
    msg := messages->i;
    insert into public.quote_messages (quote_id, position, role, body)
    values (quote_uuid, i, msg->>'role', msg->>'text');
  end loop;
end;
$$;

revoke all on function public.save_quote_session(jsonb) from public;
revoke all on function public.save_quote_session(jsonb) from anon;
revoke all on function public.save_quote_session(jsonb) from authenticated;
grant execute on function public.save_quote_session(jsonb) to service_role;
