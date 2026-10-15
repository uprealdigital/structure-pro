-- The active deal belongs to the customer. Run once in the Supabase SQL editor.
-- If active_deal_id was added to crm.conversations, this moves it onto crm.customers and drops it there.

alter table crm.customers
  add column if not exists active_deal_id uuid references crm.deals (id) on delete set null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'crm'
      and table_name = 'conversations'
      and column_name = 'active_deal_id'
  ) then
    update crm.customers as customer
    set active_deal_id = conversation.active_deal_id
    from crm.conversations as conversation
    where conversation.customer_id = customer.id
      and conversation.active_deal_id is not null
      and customer.active_deal_id is null;

    alter table crm.conversations drop column active_deal_id;
  end if;
end $$;

update crm.customers as customer
set active_deal_id = newest.deal_id
from (
  select distinct on (link.customer_id)
    link.customer_id,
    deal.id as deal_id
  from crm.deal_customers as link
  join crm.deals as deal on deal.id = link.deal_id
  where link.is_primary
  order by link.customer_id, deal.created_at desc, deal.id desc
) as newest
where customer.id = newest.customer_id
  and customer.active_deal_id is null;
