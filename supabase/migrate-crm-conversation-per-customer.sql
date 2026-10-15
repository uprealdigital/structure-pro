-- One conversation per customer. Run once in the Supabase SQL editor.
-- Keeps the oldest conversation for each customer, moves the other threads onto it, and drops deal_id.

begin;

create temporary table conversation_keepers as
select distinct on (customer_id)
  id,
  customer_id
from crm.conversations
order by customer_id, created_at asc, id asc;

update crm.activities
set position = -position - 1;

with ranked as (
  select
    activity.id,
    keeper.id as keeper_id,
    row_number() over (
      partition by keeper.id
      order by activity.created_at asc, activity.id asc
    ) - 1 as new_position
  from crm.activities as activity
  join crm.conversations as conversation on conversation.id = activity.conversation_id
  join conversation_keepers as keeper on keeper.customer_id = conversation.customer_id
)
update crm.activities as activity
set
  conversation_id = ranked.keeper_id,
  position = ranked.new_position
from ranked
where activity.id = ranked.id;

update crm.conversations as keeper
set contract_sent = true
from conversation_keepers as canonical
where keeper.id = canonical.id
  and exists (
    select 1
    from crm.conversations as sibling
    where sibling.customer_id = canonical.customer_id
      and sibling.contract_sent
  );

delete from crm.conversations as conversation
where not exists (
  select 1
  from conversation_keepers as keeper
  where keeper.id = conversation.id
);

update crm.conversations as conversation
set lookup_key = chosen.key
from (
  select
    id,
    coalesce(nullif(channel_key, ''), nullif(chat_id, '')) as key
  from crm.conversations
) as chosen
where conversation.id = chosen.id
  and chosen.key is not null
  and conversation.lookup_key is distinct from chosen.key
  and not exists (
    select 1
    from crm.conversations as other
    where other.id <> conversation.id
      and other.lookup_key = chosen.key
  );

update crm.conversations as conversation
set updated_at = coalesce(latest.created_at, conversation.created_at)
from (
  select conversation_id, max(created_at) as created_at
  from crm.activities
  group by conversation_id
) as latest
where conversation.id = latest.conversation_id;

drop index if exists crm.conversations_deal_id_key;
drop index if exists public.conversations_deal_id_key;

alter table crm.conversations drop column if exists deal_id;

alter table crm.conversations drop constraint if exists conversations_customer_id_key;

alter table crm.conversations
  add constraint conversations_customer_id_key unique (customer_id);

commit;
