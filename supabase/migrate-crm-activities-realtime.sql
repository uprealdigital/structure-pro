-- Run once in the Supabase SQL editor.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'crm'
      and tablename = 'activities'
  ) then
    alter publication supabase_realtime add table crm.activities;
  end if;
end $$;
