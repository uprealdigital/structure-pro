-- One conversation per deal. Run once in the Supabase SQL editor.

alter table crm.conversations add column if not exists channel_key text;
alter table crm.conversations add column if not exists deal_id uuid references crm.deals (id) on delete cascade;

alter table crm.conversations drop constraint if exists conversations_customer_id_key;

update crm.conversations
set channel_key = coalesce(chat_id, lookup_key)
where channel_key is null;

update crm.conversations as conversation
set deal_id = oldest.deal_id
from (
  select distinct on (link.customer_id) link.customer_id, deal.id as deal_id
  from crm.deal_customers as link
  join crm.deals as deal on deal.id = link.deal_id
  order by link.customer_id, deal.created_at asc
) as oldest
where conversation.customer_id = oldest.customer_id
  and conversation.deal_id is null;

do $$
declare
  existing record;
  later_deal record;
  following_created timestamptz;
  created_id uuid;
begin
  for existing in
    select id, customer_id, chat_id, channel_key, deal_id
    from crm.conversations
    where deal_id is not null
      and channel_key is not null
  loop
    for later_deal in
      select deal.id, deal.created_at
      from crm.deal_customers as link
      join crm.deals as deal on deal.id = link.deal_id
      where link.customer_id = existing.customer_id
        and deal.id <> existing.deal_id
      order by deal.created_at asc
    loop
      if exists (select 1 from crm.conversations where deal_id = later_deal.id) then
        continue;
      end if;

      select min(deal.created_at)
      into following_created
      from crm.deal_customers as link
      join crm.deals as deal on deal.id = link.deal_id
      where link.customer_id = existing.customer_id
        and deal.created_at > later_deal.created_at;

      insert into crm.conversations (
        lookup_key,
        channel_key,
        chat_id,
        customer_id,
        deal_id,
        contract_sent
      )
      values (
        existing.channel_key || ':' || later_deal.id::text,
        existing.channel_key,
        existing.chat_id,
        existing.customer_id,
        later_deal.id,
        false
      )
      returning id into created_id;

      update crm.activities
      set conversation_id = created_id
      where conversation_id = existing.id
        and created_at >= later_deal.created_at
        and (following_created is null or created_at < following_created);
    end loop;
  end loop;
end $$;

update crm.conversations
set lookup_key = channel_key || ':' || deal_id::text
where deal_id is not null
  and channel_key is not null
  and lookup_key is distinct from channel_key || ':' || deal_id::text;

update crm.conversations as conversation
set updated_at = coalesce(latest.created_at, conversation.created_at)
from (
  select conversation_id, max(created_at) as created_at
  from crm.activities
  group by conversation_id
) as latest
where conversation.id = latest.conversation_id;

create index if not exists conversations_channel_key_idx on crm.conversations (channel_key);

create unique index if not exists conversations_deal_id_key
  on crm.conversations (deal_id)
  where deal_id is not null;
