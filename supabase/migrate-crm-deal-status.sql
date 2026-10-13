-- Run when crm.deals.status still allows only open and invoice_sent.

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'crm'
    and rel.relname = 'deals'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%';

  if constraint_name is not null then
    execute format('alter table crm.deals drop constraint %I', constraint_name);
  end if;
end $$;

update crm.deals set status = 'lead' where status = 'open';
update crm.deals set status = 'quote_sent' where status = 'invoice_sent';

alter table crm.deals alter column status set default 'lead';

alter table crm.deals
  add constraint deals_status_check
  check (status in ('lead', 'quote_sent', 'quote_viewed', 'partially_signed', 'deal_won', 'deal_lost'));
