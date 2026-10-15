-- Run once in the Supabase SQL editor.

alter table crm.deals add column if not exists name text;

alter table crm.deals drop constraint if exists deals_name_length;

alter table crm.deals
  add constraint deals_name_length
  check (name is null or char_length(name) between 1 and 75);

notify pgrst, 'reload schema';
