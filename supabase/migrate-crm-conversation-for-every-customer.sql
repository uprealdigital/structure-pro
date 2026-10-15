-- Run once in the Supabase SQL editor.
-- Gives every customer one conversation, and opens one whenever a customer is added.

begin;

insert into crm.conversations (
  lookup_key,
  customer_id,
  contract_sent,
  created_at,
  updated_at
)
select
  case
    when exists (
      select 1
      from crm.conversations as taken
      where taken.lookup_key = customer.phone
    ) then customer.id::text
    else customer.phone
  end,
  customer.id,
  false,
  customer.created_at,
  customer.updated_at
from crm.customers as customer
where not exists (
  select 1
  from crm.conversations as conversation
  where conversation.customer_id = customer.id
);

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

commit;
