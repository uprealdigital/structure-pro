-- Move crm.customers.deal_id onto crm.deal_customers.
-- Paste in the Supabase SQL editor after supabase/schema.sql on a database
-- that already has customers.deal_id. Fresh installs skip this file.
-- One row per customer and deal. is_primary marks the one primary customer on a deal.
-- A customer who is not primary on any deal loses their conversation.

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

do $$
declare
  phone_row record;
  duplicate uuid;
  survivor uuid;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'crm'
      and table_name = 'customers'
      and column_name = 'deal_id'
  ) then
    return;
  end if;

  insert into crm.deal_customers (customer_id, deal_id, is_primary, created_at)
  select customer.id, customer.deal_id, false, customer.created_at
  from crm.customers as customer
  where customer.deal_id is not null
  on conflict (customer_id, deal_id) do nothing;

  update crm.deal_customers as link
  set is_primary = true
  from (
    select distinct on (membership.deal_id)
      membership.customer_id,
      membership.deal_id
    from crm.deal_customers as membership
    join crm.customers as customer on customer.id = membership.customer_id
    order by membership.deal_id, customer.created_at, customer.id
  ) as first_customer
  where link.customer_id = first_customer.customer_id
    and link.deal_id = first_customer.deal_id
    and not exists (
      select 1
      from crm.deal_customers as existing
      where existing.deal_id = link.deal_id
        and existing.is_primary
    );

  for phone_row in
    select phone
    from crm.customers
    group by phone
    having count(*) > 1
  loop
    select id into survivor
    from crm.customers
    where phone = phone_row.phone
    order by created_at, id
    limit 1;

    for duplicate in
      select id
      from crm.customers
      where phone = phone_row.phone
        and id <> survivor
    loop
      insert into crm.deal_customers (customer_id, deal_id, is_primary, created_at)
      select survivor, deal_id, false, created_at
      from crm.deal_customers
      where customer_id = duplicate
      on conflict (customer_id, deal_id) do nothing;

      delete from crm.deal_customers where customer_id = duplicate;

      if exists (select 1 from crm.conversations where customer_id = survivor) then
        delete from crm.conversations where customer_id = duplicate;
      else
        update crm.conversations
        set customer_id = survivor
        where customer_id = duplicate;
      end if;

      update ai.yard_previews
      set crm_customer_id = survivor
      where crm_customer_id = duplicate;

      delete from crm.customers where id = duplicate;
    end loop;
  end loop;

  update crm.deal_customers as link
  set is_primary = true
  from (
    select distinct on (membership.deal_id)
      membership.customer_id,
      membership.deal_id
    from crm.deal_customers as membership
    join crm.customers as customer on customer.id = membership.customer_id
    where not exists (
      select 1
      from crm.deal_customers as existing
      where existing.deal_id = membership.deal_id
        and existing.is_primary
    )
    order by membership.deal_id, customer.created_at, customer.id
  ) as first_customer
  where link.customer_id = first_customer.customer_id
    and link.deal_id = first_customer.deal_id;

  delete from crm.conversations as conversation
  where not exists (
    select 1
    from crm.deal_customers as link
    where link.customer_id = conversation.customer_id
      and link.is_primary
  );
end $$;

alter table crm.customers drop constraint if exists customers_deal_id_fkey;
alter table crm.customers drop constraint if exists customers_deal_id_phone_key;
drop index if exists crm.customers_deal_id_idx;
alter table crm.customers drop column if exists deal_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'crm.customers'::regclass
      and conname = 'customers_phone_key'
  ) then
    alter table crm.customers
      add constraint customers_phone_key unique (phone);
  end if;
end $$;

alter table crm.deal_customers enable row level security;
grant select, insert, update, delete on table crm.deal_customers to service_role;
