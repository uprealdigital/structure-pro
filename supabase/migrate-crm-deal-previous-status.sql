-- Run when crm.deals has no previous_status column.

alter table crm.deals
  add column if not exists previous_status text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'crm'
      and rel.relname = 'deals'
      and con.conname = 'deals_previous_status_check'
  ) then
    alter table crm.deals
      add constraint deals_previous_status_check
      check (
        previous_status is null
        or previous_status in (
          'lead',
          'quote_sent',
          'quote_viewed',
          'partially_signed',
          'deal_won',
          'deal_lost'
        )
      );
  end if;
end $$;
