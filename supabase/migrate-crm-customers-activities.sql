-- Reshape an existing module database.
-- Run after supabase/schema.sql. Skip this on a brand-new database.
-- Moves cpq.quotes into crm, renames contacts to customers and messages to
-- activities, and rewires deal → customers → conversation → activities.

do $$
begin
  if to_regclass('cpq.quotes') is not null and to_regclass('crm.quotes') is null then
    alter table cpq.quotes set schema crm;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'crm'
      and table_name = 'deals'
      and column_name = 'cpq_quote_id'
  ) then
    alter table crm.deals rename column cpq_quote_id to quote_id;
  end if;
end $$;

alter index if exists crm.deals_cpq_quote_id_idx rename to deals_quote_id_idx;

do $$
begin
  if to_regclass('crm.quotes') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'crm'
         and table_name = 'deals'
         and column_name = 'quote_id'
     )
     and not exists (
       select 1
       from pg_constraint
       where conrelid = 'crm.deals'::regclass
         and conname = 'deals_quote_id_fkey'
     ) then
    alter table crm.deals
      add constraint deals_quote_id_fkey
      foreign key (quote_id) references crm.quotes (id);
  end if;
end $$;

do $$
begin
  if to_regclass('crm.contacts') is not null and to_regclass('crm.customers') is null then
    alter table crm.contacts rename to customers;
  end if;
end $$;

alter table crm.customers drop constraint if exists contacts_phone_key;
alter table crm.customers drop constraint if exists customers_phone_key;

alter table crm.customers add column if not exists deal_id uuid;

-- One contact on several deals becomes one customer row per deal.
do $$
declare
  deal_row record;
  cloned_customer uuid;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'crm'
      and table_name = 'deals'
      and column_name = 'contact_id'
  ) then
    return;
  end if;

  for deal_row in
    select d.id as deal_id, d.contact_id
    from crm.deals d
    where d.contact_id is not null
    order by d.created_at, d.id
  loop
    if exists (
      select 1
      from crm.customers c
      where c.id = deal_row.contact_id
        and c.deal_id is null
    ) then
      update crm.customers
      set deal_id = deal_row.deal_id
      where id = deal_row.contact_id;
    elsif not exists (
      select 1
      from crm.customers c
      where c.deal_id = deal_row.deal_id
    ) then
      insert into crm.customers (
        deal_id, full_name, phone, email, opted_out, created_at, updated_at
      )
      select
        deal_row.deal_id,
        full_name,
        phone,
        email,
        opted_out,
        created_at,
        updated_at
      from crm.customers
      where id = deal_row.contact_id
      returning id into cloned_customer;
    end if;
  end loop;
end $$;

alter table crm.customers alter column deal_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.customers'::regclass
      and conname = 'customers_deal_id_fkey'
  ) then
    alter table crm.customers
      add constraint customers_deal_id_fkey
      foreign key (deal_id) references crm.deals (id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.customers'::regclass
      and conname = 'customers_deal_id_phone_key'
  ) then
    alter table crm.customers
      add constraint customers_deal_id_phone_key unique (deal_id, phone);
  end if;
end $$;

create index if not exists customers_deal_id_idx on crm.customers (deal_id);

alter table crm.conversations add column if not exists customer_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'crm'
      and table_name = 'conversations'
      and column_name = 'crm_deal_id'
  ) then
    update crm.conversations as conversation
    set customer_id = customer.id
    from crm.customers as customer
    where conversation.customer_id is null
      and customer.deal_id = conversation.crm_deal_id;
  end if;
end $$;

alter table crm.conversations drop constraint if exists conversations_crm_deal_id_fkey;
alter table crm.conversations drop column if exists crm_deal_id;
alter table crm.conversations drop column if exists cpq_quote_id;

alter table crm.conversations alter column customer_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.conversations'::regclass
      and conname = 'conversations_customer_id_fkey'
  ) then
    alter table crm.conversations
      add constraint conversations_customer_id_fkey
      foreign key (customer_id) references crm.customers (id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.conversations'::regclass
      and conname = 'conversations_customer_id_key'
  ) then
    alter table crm.conversations
      add constraint conversations_customer_id_key unique (customer_id);
  end if;
end $$;

do $$
begin
  if to_regclass('crm.messages') is not null and to_regclass('crm.activities') is null then
    alter table crm.messages rename to activities;
  end if;
end $$;

alter table crm.activities add column if not exists source text;
alter table crm.activities add column if not exists duration_seconds integer;
alter table crm.activities add column if not exists script_match integer;

update crm.activities as activity
set source = case
  when conversation.chat_id is not null and conversation.chat_id <> '' then 'telegram'
  else 'sms'
end
from crm.conversations as conversation
where activity.conversation_id = conversation.id
  and activity.source is null;

alter table crm.activities alter column source set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.activities'::regclass
      and conname = 'activities_source_check'
  ) then
    alter table crm.activities
      add constraint activities_source_check
      check (source in (
        'inbound_call',
        'outbound_call',
        'sms',
        'facebook',
        'email',
        'telegram'
      ));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.activities'::regclass
      and conname = 'activities_duration_seconds_check'
  ) then
    alter table crm.activities
      add constraint activities_duration_seconds_check
      check (duration_seconds is null or duration_seconds >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.activities'::regclass
      and conname = 'activities_script_match_check'
  ) then
    alter table crm.activities
      add constraint activities_script_match_check
      check (script_match is null or script_match between 0 and 100);
  end if;
end $$;

alter table crm.deals drop constraint if exists deals_contact_id_fkey;
drop index if exists crm.deals_contact_id_idx;
alter table crm.deals drop column if exists contact_id;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'ai'
      and table_name = 'yard_previews'
      and column_name = 'crm_contact_id'
  ) then
    alter table ai.yard_previews rename column crm_contact_id to crm_customer_id;
  end if;
end $$;

update ai.yard_previews as preview
set crm_customer_id = customer.id
from crm.customers as customer
where customer.deal_id = preview.crm_deal_id
  and not exists (
    select 1
    from crm.customers as existing
    where existing.id = preview.crm_customer_id
      and existing.deal_id = preview.crm_deal_id
  );

grant select, insert, update, delete on table crm.quotes to service_role;
grant select, insert, update, delete on table crm.customers to service_role;
grant select, insert, update, delete on table crm.activities to service_role;
