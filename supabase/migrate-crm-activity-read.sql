-- Run once in the Supabase SQL editor.

alter table crm.activities add column if not exists is_read boolean;

update crm.activities
set is_read = true
where is_read is null;

alter table crm.activities alter column is_read set default false;
alter table crm.activities alter column is_read set not null;
