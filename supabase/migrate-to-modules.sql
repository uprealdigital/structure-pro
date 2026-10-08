-- Move an existing public schema into cpq, crm, and ai.
-- Run supabase/schema.sql first, then paste this once.
-- Skip this file on a brand-new database.

do $$
begin
  if to_regclass('public.quotes') is null then
    raise exception 'public.quotes is missing. Fresh installs should run schema.sql only.';
  end if;
end $$;

-- Fold any older zip and lng columns into selections, then drop them.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'configurations'
      and column_name = 'lng'
  ) then
    update public.configurations
    set selections = jsonb_set(selections, '{lng}', to_jsonb(lng), true)
    where lng is not null
      and not (selections ? 'lng');

    alter table public.configurations drop column lng;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'configurations'
      and column_name = 'zip'
  ) then
    update public.configurations
    set selections = jsonb_set(selections, '{zip}', to_jsonb(zip), true)
    where zip is not null
      and (
        not (selections ? 'zip')
        or coalesce(selections->>'zip', '') = ''
      );

    alter table public.configurations drop column zip;
  end if;
end $$;

insert into cpq.configurations (id, selections, created_at)
select id, selections, created_at
from public.configurations
on conflict (id) do nothing;

insert into cpq.quotes (id, invoice_id, selections, created_at, updated_at)
select id, invoice_id, selections, created_at, updated_at
from public.quotes
on conflict (id) do nothing;

insert into crm.contacts (full_name, phone, email, opted_out, created_at, updated_at)
select distinct on (phone) full_name, phone, email, opted_out, created_at, updated_at
from public.quotes
order by phone, updated_at desc
on conflict (phone) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  opted_out = excluded.opted_out,
  updated_at = excluded.updated_at;

insert into crm.contacts (full_name, phone, email, opted_out, created_at, updated_at)
select distinct on (phone) full_name, phone, email, false, created_at, updated_at
from public.yard_previews
order by phone, updated_at desc
on conflict (phone) do nothing;

create temp table quote_move (
  quote_id uuid primary key,
  deal_id uuid not null,
  conversation_id uuid not null
);

insert into quote_move (quote_id, deal_id, conversation_id)
select id, gen_random_uuid(), gen_random_uuid()
from public.quotes q
where not exists (
  select 1 from crm.deals d
  where d.cpq_quote_id = q.id and d.source = 'quote'
);

insert into crm.deals (id, contact_id, cpq_quote_id, source, status, created_at, updated_at)
select
  m.deal_id,
  c.id,
  q.id,
  'quote',
  case when q.contract_sent then 'invoice_sent' else 'open' end,
  q.created_at,
  q.updated_at
from public.quotes q
join quote_move m on m.quote_id = q.id
join crm.contacts c on c.phone = q.phone;

insert into crm.conversations (
  id, lookup_key, chat_id, crm_deal_id, cpq_quote_id, contract_sent, created_at, updated_at
)
select
  m.conversation_id,
  q.lookup_key,
  q.chat_id,
  m.deal_id,
  q.id,
  q.contract_sent,
  q.created_at,
  q.updated_at
from public.quotes q
join quote_move m on m.quote_id = q.id;

insert into crm.messages (conversation_id, position, role, body, created_at)
select m.conversation_id, qm.position, qm.role, qm.body, qm.created_at
from public.quote_messages qm
join quote_move m on m.quote_id = qm.quote_id;

create temp table yard_move (
  old_id uuid primary key,
  quote_id uuid not null,
  deal_id uuid not null
);

insert into yard_move (old_id, quote_id, deal_id)
select id, gen_random_uuid(), gen_random_uuid()
from public.yard_previews y
where not exists (
  select 1 from ai.yard_previews p where p.id = y.id
);

insert into cpq.quotes (id, invoice_id, selections, created_at, updated_at)
select
  ym.quote_id,
  'PREVIEW-' || upper(substr(replace(y.id::text, '-', ''), 1, 8)),
  y.selections,
  y.created_at,
  y.updated_at
from public.yard_previews y
join yard_move ym on ym.old_id = y.id;

insert into crm.deals (id, contact_id, cpq_quote_id, source, status, created_at, updated_at)
select ym.deal_id, c.id, ym.quote_id, 'yard_preview', 'open', y.created_at, y.updated_at
from public.yard_previews y
join yard_move ym on ym.old_id = y.id
join crm.contacts c on c.phone = y.phone;

insert into ai.yard_previews (
  id,
  crm_contact_id,
  crm_deal_id,
  status,
  error,
  events,
  yard_photo_path,
  building_render_path,
  preview_path,
  created_at,
  updated_at
)
select
  y.id,
  c.id,
  ym.deal_id,
  y.status,
  y.error,
  y.events,
  y.yard_photo_path,
  y.shed_render_path,
  y.preview_path,
  y.created_at,
  y.updated_at
from public.yard_previews y
join yard_move ym on ym.old_id = y.id
join crm.contacts c on c.phone = y.phone;

drop table if exists public.quote_messages;
drop table if exists public.quotes;
drop table if exists public.yard_previews;
drop table if exists public.configurations;
