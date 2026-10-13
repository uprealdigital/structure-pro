-- Run when crm.quotes has no active_revision_id.
-- A deal still points at crm.quotes. Each quote points at its active row in crm.quote_revisions.

create table if not exists crm.quote_revisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references crm.quotes (id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  status text not null default 'draft' check (status in ('draft', 'sent')),
  selections jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, revision_number)
);

create index if not exists quote_revisions_quote_id_idx on crm.quote_revisions (quote_id);

alter table crm.quotes
  add column if not exists active_revision_id uuid;

insert into crm.quote_revisions (quote_id, revision_number, status, selections, created_at, updated_at)
select q.id, 1, 'draft', q.selections, q.created_at, q.updated_at
from crm.quotes q
where not exists (
  select 1 from crm.quote_revisions r where r.quote_id = q.id
);

update crm.quote_revisions r
set status = 'sent',
    updated_at = q.updated_at
from crm.quotes q
join crm.deals d on d.quote_id = q.id
where r.quote_id = q.id
  and r.revision_number = 1
  and d.status in ('quote_sent', 'quote_viewed', 'partially_signed', 'deal_won');

update crm.quotes q
set active_revision_id = r.id
from crm.quote_revisions r
where r.quote_id = q.id
  and r.revision_number = 1
  and q.active_revision_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_active_revision_id_fkey'
  ) then
    alter table crm.quotes
      add constraint quotes_active_revision_id_fkey
      foreign key (active_revision_id)
      references crm.quote_revisions (id)
      on delete set null;
  end if;
end $$;

alter table crm.quote_revisions enable row level security;
grant select, insert, update, delete on table crm.quote_revisions to service_role;

notify pgrst, 'reload schema';
