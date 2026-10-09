-- Sample customers, deals, conversations, activities, and calls.
-- Paste in the Supabase SQL editor after supabase/schema.sql.
-- On a database that already had the old tables, run migrate-crm-customers-activities.sql first.
-- If activities still has duration_seconds, run migrate-crm-calls.sql before this file.
-- If activities has no generated_by column, run migrate-crm-activity-author.sql before this file.
-- Fixed ids. Running this twice does not duplicate rows.

insert into crm.quotes (id, invoice_id, selections, created_at, updated_at)
values
  (
    '11111111-1111-4111-8111-111111111101',
    'SEED-1001',
    '{"styleId":"value-shed","width":12,"length":16,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"serious-gray","trimColorId":"serious-gray","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":true,"hasWindow":true,"hasVent":true,"doorStyle":"double","wallFace":"front","zip":"32091"}'::jsonb,
    now() - interval '3 days',
    now() - interval '3 days'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'SEED-1002',
    '{"styleId":"value-shed","width":10,"length":12,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"serious-gray","trimColorId":"serious-gray","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":false,"hasWindow":true,"hasVent":true,"doorStyle":"single","wallFace":"front","zip":"37201"}'::jsonb,
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'SEED-1003',
    '{"styleId":"value-shed","width":12,"length":24,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"serious-gray","trimColorId":"serious-gray","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":true,"hasWindow":true,"hasVent":true,"doorStyle":"double","wallFace":"front","zip":"78701"}'::jsonb,
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    'SEED-1004',
    '{"styleId":"value-shed","width":8,"length":12,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"serious-gray","trimColorId":"serious-gray","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":false,"hasWindow":false,"hasVent":true,"doorStyle":"single","wallFace":"front","zip":"94110"}'::jsonb,
    now() - interval '1 day',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

insert into crm.deals (id, quote_id, source, status, created_at, updated_at)
values
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111101',
    'quote',
    'open',
    now() - interval '3 days',
    now() - interval '3 days'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111102',
    'yard_preview',
    'invoice_sent',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111103',
    'quote',
    'open',
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '11111111-1111-4111-8111-111111111104',
    'quote',
    'open',
    now() - interval '1 day',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

insert into crm.customers (id, deal_id, full_name, phone, email, opted_out, created_at, updated_at)
values
  (
    '33333333-3333-4333-8333-333333333301',
    '22222222-2222-4222-8222-222222222201',
    'Maya Chen',
    '+15550001001',
    'maya.chen@example.com',
    false,
    now() - interval '3 days',
    now() - interval '30 minutes'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '22222222-2222-4222-8222-222222222202',
    'Luis Ortega',
    '+15550001002',
    'luis.ortega@example.com',
    false,
    now() - interval '2 days',
    now() - interval '2 hours'
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    '22222222-2222-4222-8222-222222222203',
    'Jordan Hale',
    '+15550001003',
    'jordan.hale@example.com',
    false,
    now() - interval '5 days',
    now() - interval '4 hours'
  ),
  (
    '33333333-3333-4333-8333-333333333304',
    '22222222-2222-4222-8222-222222222203',
    'Sam Okonkwo',
    '+15550001004',
    'sam.okonkwo@example.com',
    false,
    now() - interval '5 days',
    now() - interval '1 day'
  ),
  (
    '33333333-3333-4333-8333-333333333305',
    '22222222-2222-4222-8222-222222222204',
    'Priya Nandakumar',
    '+15550001005',
    'priya.nandakumar@example.com',
    false,
    now() - interval '1 day',
    now() - interval '3 hours'
  )
on conflict (id) do nothing;

insert into crm.conversations (id, lookup_key, customer_id, contract_sent, created_at, updated_at)
values
  (
    '44444444-4444-4444-8444-444444444401',
    '+15550001001',
    '33333333-3333-4333-8333-333333333301',
    false,
    now() - interval '3 days',
    now() - interval '30 minutes'
  ),
  (
    '44444444-4444-4444-8444-444444444402',
    '+15550001002',
    '33333333-3333-4333-8333-333333333302',
    false,
    now() - interval '2 days',
    now() - interval '2 hours'
  ),
  (
    '44444444-4444-4444-8444-444444444403',
    '+15550001003',
    '33333333-3333-4333-8333-333333333303',
    true,
    now() - interval '5 days',
    now() - interval '4 hours'
  ),
  (
    '44444444-4444-4444-8444-444444444404',
    '+15550001004',
    '33333333-3333-4333-8333-333333333304',
    true,
    now() - interval '5 days',
    now() - interval '1 day'
  ),
  (
    '44444444-4444-4444-8444-444444444405',
    '+15550001005',
    '33333333-3333-4333-8333-333333333305',
    false,
    now() - interval '1 day',
    now() - interval '3 hours'
  )
on conflict (id) do nothing;

insert into crm.activities (
  conversation_id,
  position,
  source,
  role,
  body,
  generated_by,
  created_at
)
select
  conversation.id,
  activity.position,
  activity.source,
  activity.role,
  replace(activity.body, '{name}', customer.full_name),
  activity.generated_by,
  now() - activity.ago
from crm.conversations as conversation
join crm.customers as customer on customer.id = conversation.customer_id
join (
  values
    (0, 'sms'::text, 'user'::text, 'Hi, this is {name}. Can you confirm the size we configured?'::text, 'manual'::text, interval '26 hours'),
    (1, 'sms', 'model', 'Hi {name}. Yes — I have your configuration open. What should we look at first?', 'ai', interval '25 hours'),
    (2, 'email', 'user', 'Sending this by email as well. Please use this address for the invoice.', 'manual', interval '20 hours'),
    (3, 'email', 'model', 'Got it. I will send the invoice to this email once the site questions are answered.', 'manual', interval '18 hours'),
    (4, 'facebook', 'user', 'I messaged on Facebook too. Is delivery included for my ZIP?', 'manual', interval '8 hours'),
    (5, 'telegram', 'model', 'Delivery is quoted from your ZIP. I can walk through it here.', 'ai', interval '6 hours')
) as activity(position, source, role, body, generated_by, ago) on true
where conversation.id in (
  '44444444-4444-4444-8444-444444444401',
  '44444444-4444-4444-8444-444444444402',
  '44444444-4444-4444-8444-444444444403',
  '44444444-4444-4444-8444-444444444404',
  '44444444-4444-4444-8444-444444444405'
)
on conflict (conversation_id, position) do nothing;

insert into crm.calls (
  id,
  direction,
  duration_seconds,
  script_match,
  recording_url,
  transcript,
  external_id,
  started_at,
  ended_at
)
select
  sample.call_id,
  sample.direction,
  sample.duration_seconds,
  sample.script_match,
  null,
  sample.transcript,
  sample.external_id,
  now() - sample.ago,
  now() - sample.ago + make_interval(secs => sample.duration_seconds)
from (
  values
    ('55555555-5555-4555-8555-555555555501'::uuid, 'inbound'::text, 12, 94, 'Asked when the site will be ready and whether the pad is poured.'::text, 'CA-seed-maya-in'::text, interval '3 hours'),
    ('55555555-5555-4555-8555-555555555511'::uuid, 'outbound', 185, 25, 'Called back to confirm the delivery window and the next step on the quote.', 'CA-seed-maya-out', interval '30 minutes'),
    ('55555555-5555-4555-8555-555555555502'::uuid, 'inbound', 48, 88, 'Asked if the yard photo matched the configured building.', 'CA-seed-luis-in', interval '3 hours'),
    ('55555555-5555-4555-8555-555555555512'::uuid, 'outbound', 240, 31, 'Reviewed financing and asked them to check the emailed invoice.', 'CA-seed-luis-out', interval '30 minutes'),
    ('55555555-5555-4555-8555-555555555503'::uuid, 'inbound', 75, 91, 'Confirmed the foundation is ready and asked about the deposit.', 'CA-seed-jordan-in', interval '3 hours'),
    ('55555555-5555-4555-8555-555555555513'::uuid, 'outbound', 96, 22, 'Walked through the contract and the remaining site questions.', 'CA-seed-jordan-out', interval '30 minutes'),
    ('55555555-5555-4555-8555-555555555504'::uuid, 'inbound', 20, 80, 'Asked for the same quote details sent to Jordan.', 'CA-seed-sam-in', interval '3 hours'),
    ('55555555-5555-4555-8555-555555555514'::uuid, 'outbound', 150, 28, 'Confirmed both customers are on the deal and the invoice was sent.', 'CA-seed-sam-out', interval '30 minutes'),
    ('55555555-5555-4555-8555-555555555505'::uuid, 'inbound', 33, 97, 'Asked about a smaller building and a later delivery date.', 'CA-seed-priya-in', interval '3 hours'),
    ('55555555-5555-4555-8555-555555555515'::uuid, 'outbound', 64, 18, 'Offered two delivery windows and a follow-up text.', 'CA-seed-priya-out', interval '30 minutes')
) as sample(call_id, direction, duration_seconds, script_match, transcript, external_id, ago)
on conflict (id) do nothing;

insert into crm.activities (
  conversation_id,
  position,
  source,
  role,
  body,
  generated_by,
  call_id,
  created_at
)
select
  sample.conversation_id,
  sample.position,
  sample.source,
  sample.role,
  sample.body,
  'manual',
  sample.call_id,
  now() - sample.ago
from (
  values
    ('44444444-4444-4444-8444-444444444401'::uuid, 6, 'inbound_call'::text, 'user'::text, 'Asked about the foundation and when the site will be ready.'::text, '55555555-5555-4555-8555-555555555501'::uuid, interval '3 hours'),
    ('44444444-4444-4444-8444-444444444401'::uuid, 7, 'outbound_call', 'model', 'Called back to confirm timing and the next step on the quote.', '55555555-5555-4555-8555-555555555511'::uuid, interval '30 minutes'),
    ('44444444-4444-4444-8444-444444444402'::uuid, 6, 'inbound_call', 'user', 'Asked about the foundation and when the site will be ready.', '55555555-5555-4555-8555-555555555502'::uuid, interval '3 hours'),
    ('44444444-4444-4444-8444-444444444402'::uuid, 7, 'outbound_call', 'model', 'Called back to confirm timing and the next step on the quote.', '55555555-5555-4555-8555-555555555512'::uuid, interval '30 minutes'),
    ('44444444-4444-4444-8444-444444444403'::uuid, 6, 'inbound_call', 'user', 'Asked about the foundation and when the site will be ready.', '55555555-5555-4555-8555-555555555503'::uuid, interval '3 hours'),
    ('44444444-4444-4444-8444-444444444403'::uuid, 7, 'outbound_call', 'model', 'Called back to confirm timing and the next step on the quote.', '55555555-5555-4555-8555-555555555513'::uuid, interval '30 minutes'),
    ('44444444-4444-4444-8444-444444444404'::uuid, 6, 'inbound_call', 'user', 'Asked about the foundation and when the site will be ready.', '55555555-5555-4555-8555-555555555504'::uuid, interval '3 hours'),
    ('44444444-4444-4444-8444-444444444404'::uuid, 7, 'outbound_call', 'model', 'Called back to confirm timing and the next step on the quote.', '55555555-5555-4555-8555-555555555514'::uuid, interval '30 minutes'),
    ('44444444-4444-4444-8444-444444444405'::uuid, 6, 'inbound_call', 'user', 'Asked about the foundation and when the site will be ready.', '55555555-5555-4555-8555-555555555505'::uuid, interval '3 hours'),
    ('44444444-4444-4444-8444-444444444405'::uuid, 7, 'outbound_call', 'model', 'Called back to confirm timing and the next step on the quote.', '55555555-5555-4555-8555-555555555515'::uuid, interval '30 minutes')
) as sample(conversation_id, position, source, role, body, call_id, ago)
on conflict (conversation_id, position) do nothing;

update crm.activities
set generated_by = case
  when position in (1, 5) and role = 'model' then 'ai'
  else 'manual'
end
where conversation_id in (
  '44444444-4444-4444-8444-444444444401',
  '44444444-4444-4444-8444-444444444402',
  '44444444-4444-4444-8444-444444444403',
  '44444444-4444-4444-8444-444444444404',
  '44444444-4444-4444-8444-444444444405'
)
  and position between 0 and 7;
