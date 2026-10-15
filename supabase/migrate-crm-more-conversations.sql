-- Run once in the Supabase SQL editor.
-- Adds 15 customers. Some share a deal, some have a deal of their own, and two
-- customers belong to a second deal as well. Each customer gets one conversation.
-- Threads run from 5 to 50 activities, mix SMS, email, Facebook, Telegram,
-- inbound calls, and outbound calls, and do not repeat a message.
-- Safe to run again: existing rows are skipped.

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'customers_create_conversation'
      and tgrelid = 'crm.customers'::regclass
  ) then
    alter table crm.customers disable trigger customers_create_conversation;
  end if;
end $$;

insert into crm.quotes (id, invoice_id, selections, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111201', 'SEED-2101', '{"styleId":"value-shed","width":14,"length":20,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"naval","trimColorId":"naval","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":true,"hasWindow":false,"hasVent":true,"doorStyle":"double","wallFace":"front","zip":"37211"}'::jsonb, now() - interval '4338 minutes', now() - interval '4338 minutes'),
  ('11111111-1111-4111-8111-111111111202', 'SEED-2102', '{"styleId":"studio","width":12,"length":16,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"metal","sidingColorId":"serious-gray","trimColorId":"serious-gray","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":false,"hasWindow":true,"hasVent":true,"doorStyle":"single","wallFace":"front","zip":"30308"}'::jsonb, now() - interval '4338 minutes', now() - interval '4338 minutes'),
  ('11111111-1111-4111-8111-111111111203', 'SEED-2103', '{"styleId":"value-barn","width":12,"length":24,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"red-barn","trimColorId":"red-barn","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":true,"hasWindow":false,"hasVent":true,"doorStyle":"double","wallFace":"front","zip":"78704"}'::jsonb, now() - interval '10080 minutes', now() - interval '10080 minutes'),
  ('11111111-1111-4111-8111-111111111204', 'SEED-2104', '{"styleId":"garden-shed","width":10,"length":16,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"metal","sidingColorId":"pewter-green","trimColorId":"pewter-green","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":false,"hasWindow":true,"hasVent":true,"doorStyle":"single","wallFace":"front","zip":"94110"}'::jsonb, now() - interval '12960 minutes', now() - interval '12960 minutes'),
  ('11111111-1111-4111-8111-111111111205', 'SEED-2105', '{"styleId":"mini-barn","width":12,"length":20,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"urbane-bronze","trimColorId":"urbane-bronze","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":true,"hasWindow":false,"hasVent":true,"doorStyle":"double","wallFace":"front","zip":"10011"}'::jsonb, now() - interval '24480 minutes', now() - interval '24480 minutes'),
  ('11111111-1111-4111-8111-111111111206', 'SEED-2106', '{"styleId":"chalet","width":14,"length":24,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"biscuit","trimColorId":"biscuit","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":true,"hasWindow":true,"hasVent":true,"doorStyle":"double","wallFace":"front","zip":"80205"}'::jsonb, now() - interval '4360 minutes', now() - interval '4360 minutes'),
  ('11111111-1111-4111-8111-111111111207', 'SEED-2107', '{"styleId":"craftsman-dutch-barn","width":12,"length":28,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"metal","sidingColorId":"repose-gray","trimColorId":"repose-gray","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":false,"hasWindow":false,"hasVent":true,"doorStyle":"single","wallFace":"front","zip":"98101"}'::jsonb, now() - interval '7200 minutes', now() - interval '7200 minutes'),
  ('11111111-1111-4111-8111-111111111208', 'SEED-2108', '{"styleId":"barn-porch","width":10,"length":20,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"favorite-tan","trimColorId":"favorite-tan","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":false,"hasWindow":true,"hasVent":true,"doorStyle":"single","wallFace":"front","zip":"97201"}'::jsonb, now() - interval '33120 minutes', now() - interval '33120 minutes'),
  ('11111111-1111-4111-8111-111111111209', 'SEED-2109', '{"styleId":"metal-standard-cottage","width":12,"length":32,"height":8,"sidingTypeId":"metal","roofTypeId":"metal","sidingColorId":"cyberspace","trimColorId":"cyberspace","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":true,"hasWindow":false,"hasVent":true,"doorStyle":"double","wallFace":"front","zip":"55401"}'::jsonb, now() - interval '90720 minutes', now() - interval '90720 minutes'),
  ('11111111-1111-4111-8111-111111111210', 'SEED-2110', '{"styleId":"craftsman-cottage-porch","width":12,"length":24,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"dovetail","trimColorId":"dovetail","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":true,"hasWindow":true,"hasVent":true,"doorStyle":"single","wallFace":"front","zip":"64108"}'::jsonb, now() - interval '4415 minutes', now() - interval '4415 minutes'),
  ('11111111-1111-4111-8111-111111111211', 'SEED-2111', '{"styleId":"metal-dutch-barn","width":10,"length":12,"height":8,"sidingTypeId":"metal","roofTypeId":"metal","sidingColorId":"ice-cube-white","trimColorId":"ice-cube-white","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":false,"hasWindow":false,"hasVent":true,"doorStyle":"none","wallFace":"front","zip":"29201"}'::jsonb, now() - interval '580320 minutes', now() - interval '580320 minutes'),
  ('11111111-1111-4111-8111-111111111212', 'SEED-2112', '{"styleId":"craftsman-wood-cottage","width":14,"length":32,"height":8,"sidingTypeId":"lp-smart","roofTypeId":"shingle","sidingColorId":"rosemary","trimColorId":"rosemary","roofColorId":"cyberspace","shutterColorId":"ice-cube-white","flooringId":"tg-prostruct","hasLoft":true,"hasWindow":true,"hasVent":true,"doorStyle":"double","wallFace":"front","zip":"32801"}'::jsonb, now() - interval '69120 minutes', now() - interval '69120 minutes')
on conflict (id) do nothing;

insert into crm.deals (id, quote_id, source, status, previous_status, created_at, updated_at)
values
  ('22222222-2222-4222-8222-222222222301', '11111111-1111-4111-8111-111111111201', 'quote', 'lead', null, now() - interval '2898 minutes', now() - interval '2898 minutes'),
  ('22222222-2222-4222-8222-222222222302', '11111111-1111-4111-8111-111111111202', 'quote', 'quote_sent', null, now() - interval '2898 minutes', now() - interval '2898 minutes'),
  ('22222222-2222-4222-8222-222222222303', '11111111-1111-4111-8111-111111111203', 'yard_preview', 'quote_viewed', null, now() - interval '8640 minutes', now() - interval '8640 minutes'),
  ('22222222-2222-4222-8222-222222222304', '11111111-1111-4111-8111-111111111204', 'yard_preview', 'lead', null, now() - interval '11520 minutes', now() - interval '11520 minutes'),
  ('22222222-2222-4222-8222-222222222305', '11111111-1111-4111-8111-111111111205', 'quote', 'partially_signed', null, now() - interval '23040 minutes', now() - interval '23040 minutes'),
  ('22222222-2222-4222-8222-222222222306', '11111111-1111-4111-8111-111111111206', 'quote', 'deal_won', null, now() - interval '2920 minutes', now() - interval '2920 minutes'),
  ('22222222-2222-4222-8222-222222222307', '11111111-1111-4111-8111-111111111207', 'quote', 'deal_lost', 'quote_sent', now() - interval '5760 minutes', now() - interval '5760 minutes'),
  ('22222222-2222-4222-8222-222222222308', '11111111-1111-4111-8111-111111111208', 'yard_preview', 'lead', null, now() - interval '31680 minutes', now() - interval '31680 minutes'),
  ('22222222-2222-4222-8222-222222222309', '11111111-1111-4111-8111-111111111209', 'quote', 'quote_sent', null, now() - interval '89280 minutes', now() - interval '89280 minutes'),
  ('22222222-2222-4222-8222-222222222310', '11111111-1111-4111-8111-111111111210', 'quote', 'lead', null, now() - interval '2975 minutes', now() - interval '2975 minutes'),
  ('22222222-2222-4222-8222-222222222311', '11111111-1111-4111-8111-111111111211', 'quote', 'quote_viewed', null, now() - interval '578880 minutes', now() - interval '578880 minutes'),
  ('22222222-2222-4222-8222-222222222312', '11111111-1111-4111-8111-111111111212', 'quote', 'lead', null, now() - interval '67680 minutes', now() - interval '67680 minutes')
on conflict (id) do nothing;

insert into crm.customers (id, full_name, phone, email, opted_out, created_at, updated_at)
select seed.id, seed.full_name, seed.phone, seed.email, seed.opted_out, seed.created_at, seed.updated_at
from (
  values
  ('33333333-3333-4333-8333-333333333309'::uuid, 'Harper Quinn', '+15550001009', 'harper.quinn@example.com', false, now() - interval '2418 minutes', now() - interval '18 minutes'),
  ('33333333-3333-4333-8333-333333333310'::uuid, 'Mateo Alvarez', '+15550001010', 'mateo.alvarez@example.com', false, now() - interval '1800 minutes', now() - interval '1560 minutes'),
  ('33333333-3333-4333-8333-333333333311'::uuid, 'Camille Durand', '+15550001011', 'camille.durand@example.com', false, now() - interval '4896 minutes', now() - interval '4320 minutes'),
  ('33333333-3333-4333-8333-333333333312'::uuid, 'Owen Briggs', '+15550001012', 'owen.briggs@example.com', false, now() - interval '6624 minutes', now() - interval '5760 minutes'),
  ('33333333-3333-4333-8333-333333333313'::uuid, 'Fatima Rahman', '+15550001013', 'fatima.rahman@example.com', false, now() - interval '8496 minutes', now() - interval '7200 minutes'),
  ('33333333-3333-4333-8333-333333333314'::uuid, 'Leo Park', '+15550001014', 'leo.park@example.com', false, now() - interval '9024 minutes', now() - interval '8640 minutes'),
  ('33333333-3333-4333-8333-333333333315'::uuid, 'Sienna Walsh', '+15550001015', 'sienna.walsh@example.com', false, now() - interval '14544 minutes', now() - interval '12960 minutes'),
  ('33333333-3333-4333-8333-333333333316'::uuid, 'Andre Mitchell', '+15550001016', 'andre.mitchell@example.com', false, now() - interval '20880 minutes', now() - interval '20160 minutes'),
  ('33333333-3333-4333-8333-333333333317'::uuid, 'Naomi Feldman', '+15550001017', 'naomi.feldman@example.com', false, now() - interval '2056 minutes', now() - interval '40 minutes'),
  ('33333333-3333-4333-8333-333333333318'::uuid, 'Theo Lang', '+15550001018', 'theo.lang@example.com', false, now() - interval '3168 minutes', now() - interval '2880 minutes'),
  ('33333333-3333-4333-8333-333333333319'::uuid, 'Ingrid Solberg', '+15550001019', 'ingrid.solberg@example.com', false, now() - interval '29808 minutes', now() - interval '28800 minutes'),
  ('33333333-3333-4333-8333-333333333320'::uuid, 'Malik Henderson', '+15550001020', 'malik.henderson@example.com', false, now() - interval '88128 minutes', now() - interval '86400 minutes'),
  ('33333333-3333-4333-8333-333333333321'::uuid, 'Ruby Sato', '+15550001021', 'ruby.sato@example.com', false, now() - interval '527 minutes', now() - interval '95 minutes'),
  ('33333333-3333-4333-8333-333333333322'::uuid, 'Caleb Nguyen', '+15550001022', 'caleb.nguyen@example.com', false, now() - interval '578304 minutes', now() - interval '576000 minutes'),
  ('33333333-3333-4333-8333-333333333323'::uuid, 'Freya Olsen', '+15550001023', 'freya.olsen@example.com', false, now() - interval '65952 minutes', now() - interval '64800 minutes')
) as seed (id, full_name, phone, email, opted_out, created_at, updated_at)
where not exists (
  select 1
  from crm.customers as customer
  where customer.id = seed.id
     or customer.phone = seed.phone
);

insert into crm.deal_customers (customer_id, deal_id, is_primary, created_at)
values
  ('33333333-3333-4333-8333-333333333309'::uuid, '22222222-2222-4222-8222-222222222301'::uuid, true, now() - interval '1458 minutes'),
  ('33333333-3333-4333-8333-333333333310'::uuid, '22222222-2222-4222-8222-222222222301'::uuid, false, now() - interval '3000 minutes'),
  ('33333333-3333-4333-8333-333333333311'::uuid, '22222222-2222-4222-8222-222222222301'::uuid, false, now() - interval '5760 minutes'),
  ('33333333-3333-4333-8333-333333333309'::uuid, '22222222-2222-4222-8222-222222222302'::uuid, true, now() - interval '1458 minutes'),
  ('33333333-3333-4333-8333-333333333312'::uuid, '22222222-2222-4222-8222-222222222303'::uuid, true, now() - interval '7200 minutes'),
  ('33333333-3333-4333-8333-333333333313'::uuid, '22222222-2222-4222-8222-222222222303'::uuid, false, now() - interval '8640 minutes'),
  ('33333333-3333-4333-8333-333333333314'::uuid, '22222222-2222-4222-8222-222222222304'::uuid, true, now() - interval '10080 minutes'),
  ('33333333-3333-4333-8333-333333333315'::uuid, '22222222-2222-4222-8222-222222222304'::uuid, false, now() - interval '14400 minutes'),
  ('33333333-3333-4333-8333-333333333316'::uuid, '22222222-2222-4222-8222-222222222305'::uuid, true, now() - interval '21600 minutes'),
  ('33333333-3333-4333-8333-333333333317'::uuid, '22222222-2222-4222-8222-222222222306'::uuid, true, now() - interval '1480 minutes'),
  ('33333333-3333-4333-8333-333333333318'::uuid, '22222222-2222-4222-8222-222222222307'::uuid, true, now() - interval '4320 minutes'),
  ('33333333-3333-4333-8333-333333333319'::uuid, '22222222-2222-4222-8222-222222222308'::uuid, true, now() - interval '30240 minutes'),
  ('33333333-3333-4333-8333-333333333320'::uuid, '22222222-2222-4222-8222-222222222309'::uuid, true, now() - interval '87840 minutes'),
  ('33333333-3333-4333-8333-333333333321'::uuid, '22222222-2222-4222-8222-222222222310'::uuid, true, now() - interval '1535 minutes'),
  ('33333333-3333-4333-8333-333333333322'::uuid, '22222222-2222-4222-8222-222222222310'::uuid, false, now() - interval '577440 minutes'),
  ('33333333-3333-4333-8333-333333333322'::uuid, '22222222-2222-4222-8222-222222222311'::uuid, true, now() - interval '577440 minutes'),
  ('33333333-3333-4333-8333-333333333323'::uuid, '22222222-2222-4222-8222-222222222312'::uuid, true, now() - interval '66240 minutes')
on conflict (customer_id, deal_id) do nothing;

insert into crm.conversations (id, lookup_key, customer_id, contract_sent, created_at, updated_at)
select seed.id, seed.lookup_key, seed.customer_id, seed.contract_sent, seed.created_at, seed.updated_at
from (
  values
    ('44444444-4444-4444-8444-444444444409'::uuid, '+15550001009', '33333333-3333-4333-8333-333333333309'::uuid, false, now() - interval '2418 minutes', now() - interval '18 minutes'),
    ('44444444-4444-4444-8444-444444444410'::uuid, '+15550001010', '33333333-3333-4333-8333-333333333310'::uuid, false, now() - interval '1800 minutes', now() - interval '1560 minutes'),
    ('44444444-4444-4444-8444-444444444411'::uuid, '+15550001011', '33333333-3333-4333-8333-333333333311'::uuid, false, now() - interval '4896 minutes', now() - interval '4320 minutes'),
    ('44444444-4444-4444-8444-444444444412'::uuid, '+15550001012', '33333333-3333-4333-8333-333333333312'::uuid, false, now() - interval '6624 minutes', now() - interval '5760 minutes'),
    ('44444444-4444-4444-8444-444444444413'::uuid, '+15550001013', '33333333-3333-4333-8333-333333333313'::uuid, false, now() - interval '8496 minutes', now() - interval '7200 minutes'),
    ('44444444-4444-4444-8444-444444444414'::uuid, '+15550001014', '33333333-3333-4333-8333-333333333314'::uuid, false, now() - interval '9024 minutes', now() - interval '8640 minutes'),
    ('44444444-4444-4444-8444-444444444415'::uuid, '+15550001015', '33333333-3333-4333-8333-333333333315'::uuid, false, now() - interval '14544 minutes', now() - interval '12960 minutes'),
    ('44444444-4444-4444-8444-444444444416'::uuid, '+15550001016', '33333333-3333-4333-8333-333333333316'::uuid, true, now() - interval '20880 minutes', now() - interval '20160 minutes'),
    ('44444444-4444-4444-8444-444444444417'::uuid, '+15550001017', '33333333-3333-4333-8333-333333333317'::uuid, true, now() - interval '2056 minutes', now() - interval '40 minutes'),
    ('44444444-4444-4444-8444-444444444418'::uuid, '+15550001018', '33333333-3333-4333-8333-333333333318'::uuid, false, now() - interval '3168 minutes', now() - interval '2880 minutes'),
    ('44444444-4444-4444-8444-444444444419'::uuid, '+15550001019', '33333333-3333-4333-8333-333333333319'::uuid, false, now() - interval '29808 minutes', now() - interval '28800 minutes'),
    ('44444444-4444-4444-8444-444444444420'::uuid, '+15550001020', '33333333-3333-4333-8333-333333333320'::uuid, false, now() - interval '88128 minutes', now() - interval '86400 minutes'),
    ('44444444-4444-4444-8444-444444444421'::uuid, '+15550001021', '33333333-3333-4333-8333-333333333321'::uuid, false, now() - interval '527 minutes', now() - interval '95 minutes'),
    ('44444444-4444-4444-8444-444444444422'::uuid, '+15550001022', '33333333-3333-4333-8333-333333333322'::uuid, false, now() - interval '578304 minutes', now() - interval '576000 minutes'),
    ('44444444-4444-4444-8444-444444444423'::uuid, '+15550001023', '33333333-3333-4333-8333-333333333323'::uuid, false, now() - interval '65952 minutes', now() - interval '64800 minutes')
) as seed (id, lookup_key, customer_id, contract_sent, created_at, updated_at)
where not exists (
  select 1
  from crm.conversations as conversation
  where conversation.id = seed.id
     or conversation.customer_id = seed.customer_id
     or conversation.lookup_key = seed.lookup_key
);

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'customers_create_conversation'
      and tgrelid = 'crm.customers'::regclass
      and tgenabled = 'D'
  ) then
    alter table crm.customers enable trigger customers_create_conversation;
  end if;
end $$;

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
values
  ('66666666-6666-4666-8666-000000000002'::uuid, 'outbound', 302, 33, null, 'Outbound call with Harper about moving the loft ladder to the left wall for the 14x20 Value Shed in Nashville. Agreed to hold the build slot until the pad is inspected.', 'CA-more-309-1', now() - interval '2322 minutes', now() - interval '2322 minutes' + make_interval(secs => 302)),
  ('66666666-6666-4666-8666-000000000003'::uuid, 'outbound', 130, 27, null, 'Outbound call with Harper about the skylight option over the work area for the 14x20 Value Shed in Nashville. Agreed to note it on the work order before the panels are cut.', 'CA-more-309-25', now() - interval '1170 minutes', now() - interval '1170 minutes' + make_interval(secs => 130)),
  ('66666666-6666-4666-8666-000000000004'::uuid, 'outbound', 284, 89, null, 'Outbound call with Harper about the anchor kit for the wind rating for the 14x20 Value Shed in Nashville. Agreed to add it as a site note rather than a factory change.', 'CA-more-309-47', now() - interval '114 minutes', now() - interval '114 minutes' + make_interval(secs => 284)),
  ('66666666-6666-4666-8666-000000000005'::uuid, 'inbound', 315, 38, null, 'Mateo called in about the moisture barrier under the floor on the 14x20 Value Shed headed to Nashville 37211. They want us to check the HOA packet and reply with what is missing.', 'CA-more-310-1', now() - interval '1737 minutes', now() - interval '1737 minutes' + make_interval(secs => 315)),
  ('66666666-6666-4666-8666-000000000006'::uuid, 'outbound', 328, 43, null, 'Outbound call with Camille about shelving cleats at 16 inches on center for the 14x20 Value Shed in Nashville. Agreed to send photos of the same building in that color.', 'CA-more-311-1', now() - interval '5020 minutes', now() - interval '5020 minutes' + make_interval(secs => 328)),
  ('66666666-6666-4666-8666-000000000007'::uuid, 'outbound', 44, 41, null, 'Outbound call with Camille about a Dutch door on the front only for the 14x20 Value Shed in Nashville. Agreed to note it on the work order before the panels are cut.', 'CA-more-311-9', now() - interval '4460 minutes', now() - interval '4460 minutes' + make_interval(secs => 44)),
  ('66666666-6666-4666-8666-000000000008'::uuid, 'inbound', 341, 48, null, 'Owen called in about a flower-box shelf under the front window on the 12x24 Value Barn headed to Austin 78704. They want us to schedule a five-minute call after lunch.', 'CA-more-312-1', now() - interval '7056 minutes', now() - interval '7056 minutes' + make_interval(secs => 341)),
  ('66666666-6666-4666-8666-000000000009'::uuid, 'inbound', 99, 22, null, 'Owen called in about a ridge vent instead of gable vents on the 12x24 Value Barn headed to Austin 78704. They want us to email the itemized total with tax for this ZIP.', 'CA-more-312-15', now() - interval '5922 minutes', now() - interval '5922 minutes' + make_interval(secs => 99)),
  ('66666666-6666-4666-8666-000000000010'::uuid, 'outbound', 354, 53, null, 'Outbound call with Fatima about staining the ramp boards before delivery for the 12x24 Value Barn in Austin. Agreed to add it as a site note rather than a factory change.', 'CA-more-313-1', now() - interval '9500 minutes', now() - interval '9500 minutes' + make_interval(secs => 354)),
  ('66666666-6666-4666-8666-000000000011'::uuid, 'outbound', 98, 95, null, 'Outbound call with Fatima about the delivery truck clearance on the alley for the 12x24 Value Barn in Austin. Agreed to send a revised drawing with that change marked.', 'CA-more-313-13', now() - interval '8396 minutes', now() - interval '8396 minutes' + make_interval(secs => 98)),
  ('66666666-6666-4666-8666-000000000012'::uuid, 'inbound', 175, 36, null, 'Fatima called in about the ramp slope for a wheelbarrow on the 12x24 Value Barn headed to Austin 78704. They want us to keep the current revision and only update the note.', 'CA-more-313-24', now() - interval '7384 minutes', now() - interval '7384 minutes' + make_interval(secs => 175)),
  ('66666666-6666-4666-8666-000000000013'::uuid, 'inbound', 27, 58, null, 'Leo called in about a concrete apron in front of the doors on the 10x16 Garden Shed headed to San Francisco 94110. They want us to quote the ramp as a separate line.', 'CA-more-314-1', now() - interval '9258 minutes', now() - interval '9258 minutes' + make_interval(secs => 27)),
  ('66666666-6666-4666-8666-000000000014'::uuid, 'outbound', 40, 63, null, 'Outbound call with Sienna about moving the loft ladder to the left wall for the 10x16 Garden Shed in San Francisco. Agreed to email the itemized total with tax for this ZIP.', 'CA-more-315-1', now() - interval '14107 minutes', now() - interval '14107 minutes' + make_interval(secs => 40)),
  ('66666666-6666-4666-8666-000000000015'::uuid, 'inbound', 145, 48, null, 'Sienna called in about shelving cleats at 16 inches on center on the 10x16 Garden Shed headed to San Francisco 94110. They want us to put the signed page back in the packet.', 'CA-more-315-16', now() - interval '13552 minutes', now() - interval '13552 minutes' + make_interval(secs => 145)),
  ('66666666-6666-4666-8666-000000000016'::uuid, 'inbound', 243, 22, null, 'Sienna called in about moving the vent so it misses the neighbor''s maple on the 10x16 Garden Shed headed to San Francisco 94110. They want us to move the deposit request to Friday.', 'CA-more-315-30', now() - interval '13034 minutes', now() - interval '13034 minutes' + make_interval(secs => 243)),
  ('66666666-6666-4666-8666-000000000017'::uuid, 'inbound', 53, 68, null, 'Andre called in about the deposit timing before the build slot on the 12x20 Mini Barn headed to New York 10011. They want us to send photos of the same building in that color.', 'CA-more-316-1', now() - interval '20784 minutes', now() - interval '20784 minutes' + make_interval(secs => 53)),
  ('66666666-6666-4666-8666-000000000018'::uuid, 'outbound', 130, 9, null, 'Outbound call with Andre about a wider ramp for the lawn tractor for the 12x20 Mini Barn in New York. Agreed to schedule a five-minute call after lunch.', 'CA-more-316-12', now() - interval '20256 minutes', now() - interval '20256 minutes' + make_interval(secs => 130)),
  ('66666666-6666-4666-8666-000000000019'::uuid, 'outbound', 66, 73, null, 'Outbound call with Naomi about the window placement above the potting bench for the 14x24 Chalet in Denver. Agreed to move the deposit request to Friday.', 'CA-more-317-1', now() - interval '2400 minutes', now() - interval '2400 minutes' + make_interval(secs => 66)),
  ('66666666-6666-4666-8666-000000000020'::uuid, 'outbound', 206, 23, null, 'Outbound call with Naomi about the ramp slope for a wheelbarrow for the 14x24 Chalet in Denver. Agreed to move the deposit request to Friday.', 'CA-more-317-21', now() - interval '1220 minutes', now() - interval '1220 minutes' + make_interval(secs => 206)),
  ('66666666-6666-4666-8666-000000000021'::uuid, 'outbound', 332, 41, null, 'Outbound call with Naomi about the anchor kit for the wind rating for the 14x24 Chalet in Denver. Agreed to check the HOA packet and reply with what is missing.', 'CA-more-317-39', now() - interval '158 minutes', now() - interval '158 minutes' + make_interval(secs => 332)),
  ('66666666-6666-4666-8666-000000000022'::uuid, 'inbound', 79, 78, null, 'Theo called in about the moisture barrier under the floor on the 12x28 Craftsman Dutch Barn headed to Seattle 98101. They want us to lock the color so the siding order can go out.', 'CA-more-318-1', now() - interval '3160 minutes', now() - interval '3160 minutes' + make_interval(secs => 79)),
  ('66666666-6666-4666-8666-000000000023'::uuid, 'outbound', 92, 83, null, 'Outbound call with Ingrid about a lockable loft hatch for the 10x20 Barn Porch in Portland. Agreed to price that option on the next revision.', 'CA-more-319-1', now() - interval '30339 minutes', now() - interval '30339 minutes' + make_interval(secs => 92)),
  ('66666666-6666-4666-8666-000000000024'::uuid, 'inbound', 211, 90, null, 'Ingrid called in about the deposit timing before the build slot on the 10x20 Barn Porch headed to Portland 97201. They want us to put the signed page back in the packet.', 'CA-more-319-18', now() - interval '28962 minutes', now() - interval '28962 minutes' + make_interval(secs => 211)),
  ('66666666-6666-4666-8666-000000000025'::uuid, 'inbound', 105, 88, null, 'Malik called in about the warranty card after install on the 12x32 Metal Standard Cottage headed to Minneapolis 55401. They want us to text the delivery window once the shop confirms it.', 'CA-more-320-1', now() - interval '89528 minutes', now() - interval '89528 minutes' + make_interval(secs => 105)),
  ('66666666-6666-4666-8666-000000000026'::uuid, 'outbound', 224, 95, null, 'Outbound call with Malik about the color match between the trim and the porch posts for the 12x32 Metal Standard Cottage in Minneapolis. Agreed to hold the build slot until the pad is inspected.', 'CA-more-320-18', now() - interval '87964 minutes', now() - interval '87964 minutes' + make_interval(secs => 224)),
  ('66666666-6666-4666-8666-000000000027'::uuid, 'inbound', 329, 80, null, 'Malik called in about moving the vent so it misses the neighbor''s maple on the 12x32 Metal Standard Cottage headed to Minneapolis 55401. They want us to lock the color so the siding order can go out.', 'CA-more-320-33', now() - interval '86584 minutes', now() - interval '86584 minutes' + make_interval(secs => 329)),
  ('66666666-6666-4666-8666-000000000028'::uuid, 'outbound', 118, 93, null, 'Outbound call with Ruby about the deposit timing before the build slot for the 12x24 Craftsman Cottage Porch in Kansas City. Agreed to send a revised drawing with that change marked.', 'CA-more-321-1', now() - interval '816 minutes', now() - interval '816 minutes' + make_interval(secs => 118)),
  ('66666666-6666-4666-8666-000000000029'::uuid, 'inbound', 131, 8, null, 'Caleb called in about keeping the double doors from swinging into the fence on the 10x12 Metal Dutch Barn headed to Charleston 29201. They want us to send the financing breakdown without the loft.', 'CA-more-322-1', now() - interval '577702 minutes', now() - interval '577702 minutes' + make_interval(secs => 131)),
  ('66666666-6666-4666-8666-000000000030'::uuid, 'outbound', 292, 81, null, 'Outbound call with Caleb about keeping the floor untreated for a later epoxy coat for the 10x12 Metal Dutch Barn in Charleston. Agreed to move the deposit request to Friday.', 'CA-more-322-24', now() - interval '576851 minutes', now() - interval '576851 minutes' + make_interval(secs => 292)),
  ('66666666-6666-4666-8666-000000000031'::uuid, 'inbound', 99, 42, null, 'Caleb called in about the anchor kit for the wind rating on the 10x12 Metal Dutch Barn headed to Charleston 29201. They want us to quote the ramp as a separate line.', 'CA-more-322-45', now() - interval '576074 minutes', now() - interval '576074 minutes' + make_interval(secs => 99)),
  ('66666666-6666-4666-8666-000000000032'::uuid, 'outbound', 144, 13, null, 'Outbound call with Freya about the moisture barrier under the floor for the 14x32 Craftsman Wood Cottage in Orlando. Agreed to put the signed page back in the packet.', 'CA-more-323-1', now() - interval '65856 minutes', now() - interval '65856 minutes' + make_interval(secs => 144)),
  ('66666666-6666-4666-8666-000000000033'::uuid, 'outbound', 284, 53, null, 'Outbound call with Freya about a partition wall for a small office nook for the 14x32 Craftsman Wood Cottage in Orlando. Agreed to put the signed page back in the packet.', 'CA-more-323-21', now() - interval '64896 minutes', now() - interval '64896 minutes' + make_interval(secs => 284))
on conflict (id) do nothing;

insert into crm.activities (
  conversation_id,
  position,
  channel,
  role,
  body,
  generated_by,
  call_id,
  created_at
)
values
  ('44444444-4444-4444-8444-444444444409'::uuid, 0, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about whether the gravel pad needs to be six inches above grade for the 14x20 Value Shed in naval going to Nashville 37211. Please send a revised drawing with that change marked.

Thanks,
Harper', 'manual', null, now() - interval '2370 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 1, 'call', 'model', 'Outbound call with Harper about moving the loft ladder to the left wall for the 14x20 Value Shed in Nashville. Agreed to hold the build slot until the pad is inspected.', 'manual', '66666666-6666-4666-8666-000000000002'::uuid, now() - interval '2322 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 2, 'telegram', 'user', 'Harper via Telegram. A ridge vent instead of gable vents is the open item on the 14x20 Value Shed for 37211. Please price that option on the next revision.', 'manual', null, now() - interval '2274 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 3, 'sms', 'model', 'Hi Harper. On keeping the double doors from swinging into the fence, I can text the delivery window once the shop confirms it for the 14x20 Value Shed headed to Nashville.', 'manual', null, now() - interval '2226 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 4, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about the electrical stub-out on the back wall for the 14x20 Value Shed in naval going to Nashville 37211. Please email the itemized total with tax for this ZIP.

Thanks,
Harper', 'manual', null, now() - interval '2178 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 5, 'facebook', 'model', 'Hi Harper, saw your note on a wider ramp for the lawn tractor. For the 14x20 Value Shed in Nashville I will note it on the work order before the panels are cut.', 'ai', null, now() - interval '2130 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 6, 'telegram', 'user', 'Harper via Telegram. Staining the ramp boards before delivery is the open item on the 14x20 Value Shed for 37211. Please ask the driver to walk the path the day before.', 'manual', null, now() - interval '2082 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 7, 'sms', 'model', 'Hi Harper. On the anchor kit for the wind rating, I can leave that line off the contract until we measure for the 14x20 Value Shed headed to Nashville.', 'manual', null, now() - interval '2034 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 8, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about adding a workbench along the right wall for the 14x20 Value Shed in naval going to Nashville 37211. Please add it as a site note rather than a factory change.

Thanks,
Harper', 'manual', null, now() - interval '1986 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 9, 'facebook', 'model', 'Hi Harper, saw your note on the window placement above the potting bench. For the 14x20 Value Shed in Nashville I will schedule a five-minute call after lunch.', 'manual', null, now() - interval '1938 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 10, 'telegram', 'user', 'Harper via Telegram. A taller wall so the mower deck clears is the open item on the 14x20 Value Shed for 37211. Please send the financing breakdown without the loft.', 'manual', null, now() - interval '1890 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 11, 'sms', 'model', 'Hi Harper. On the moisture barrier under the floor, I can keep the current revision and only update the note for the 14x20 Value Shed headed to Nashville.', 'ai', null, now() - interval '1842 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 12, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about replacing one window with a solid panel for the 14x20 Value Shed in naval going to Nashville 37211. Please check the HOA packet and reply with what is missing.

Thanks,
Harper', 'manual', null, now() - interval '1794 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 13, 'facebook', 'model', 'Hi Harper, saw your note on the permit drawing for the homeowners association. For the 14x20 Value Shed in Nashville I will move the deposit request to Friday.', 'manual', null, now() - interval '1746 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 14, 'telegram', 'user', 'Harper via Telegram. A side entry so the garden path stays open is the open item on the 14x20 Value Shed for 37211. Please confirm the crew can stage from the alley.', 'manual', null, now() - interval '1698 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 15, 'sms', 'model', 'Hi Harper. On the color match between the trim and the porch posts, I can quote the ramp as a separate line for the 14x20 Value Shed headed to Nashville.', 'manual', null, now() - interval '1650 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 16, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about shelving cleats at 16 inches on center for the 14x20 Value Shed in naval going to Nashville 37211. Please lock the color so the siding order can go out.

Thanks,
Harper', 'manual', null, now() - interval '1602 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 17, 'facebook', 'model', 'Hi Harper, saw your note on a lockable loft hatch. For the 14x20 Value Shed in Nashville I will send photos of the same building in that color.', 'ai', null, now() - interval '1554 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 18, 'telegram', 'user', 'Harper via Telegram. The delivery truck clearance on the alley is the open item on the 14x20 Value Shed for 37211. Please update the co-buyer on the shared deal.', 'manual', null, now() - interval '1506 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 19, 'sms', 'model', 'Hi Harper. On pouring the piers before the crew arrives, I can put the signed page back in the packet for the 14x20 Value Shed headed to Nashville.', 'manual', null, now() - interval '1458 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 20, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about a metal threshold at the doorway for the 14x20 Value Shed in naval going to Nashville 37211. Please send a revised drawing with that change marked.

Thanks,
Harper', 'manual', null, now() - interval '1410 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 21, 'facebook', 'model', 'Hi Harper, saw your note on the gutter downspout landing away from the pad. For the 14x20 Value Shed in Nashville I will hold the build slot until the pad is inspected.', 'manual', null, now() - interval '1362 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 22, 'telegram', 'user', 'Harper via Telegram. An extra tie-down at the back corners is the open item on the 14x20 Value Shed for 37211. Please price that option on the next revision.', 'manual', null, now() - interval '1314 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 23, 'sms', 'model', 'Hi Harper. On the interior height under the loft, I can text the delivery window once the shop confirms it for the 14x20 Value Shed headed to Nashville.', 'ai', null, now() - interval '1266 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 24, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about a Dutch door on the front only for the 14x20 Value Shed in naval going to Nashville 37211. Please email the itemized total with tax for this ZIP.

Thanks,
Harper', 'manual', null, now() - interval '1218 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 25, 'call', 'model', 'Outbound call with Harper about the skylight option over the work area for the 14x20 Value Shed in Nashville. Agreed to note it on the work order before the panels are cut.', 'manual', '66666666-6666-4666-8666-000000000003'::uuid, now() - interval '1170 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 26, 'telegram', 'user', 'Harper via Telegram. Keeping the floor untreated for a later epoxy coat is the open item on the 14x20 Value Shed for 37211. Please ask the driver to walk the path the day before.', 'manual', null, now() - interval '1122 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 27, 'sms', 'model', 'Hi Harper. On the setback from the property line, I can leave that line off the contract until we measure for the 14x20 Value Shed headed to Nashville.', 'manual', null, now() - interval '1074 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 28, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about a flower-box shelf under the front window for the 14x20 Value Shed in naval going to Nashville 37211. Please add it as a site note rather than a factory change.

Thanks,
Harper', 'manual', null, now() - interval '1026 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 29, 'facebook', 'model', 'Hi Harper, saw your note on the ramp slope for a wheelbarrow. For the 14x20 Value Shed in Nashville I will schedule a five-minute call after lunch.', 'ai', null, now() - interval '978 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 30, 'telegram', 'user', 'Harper via Telegram. Moving the vent so it misses the neighbor''s maple is the open item on the 14x20 Value Shed for 37211. Please send the financing breakdown without the loft.', 'manual', null, now() - interval '930 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 31, 'sms', 'model', 'Hi Harper. On a partition wall for a small office nook, I can keep the current revision and only update the note for the 14x20 Value Shed headed to Nashville.', 'manual', null, now() - interval '882 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 32, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about the shutter color against the siding sample for the 14x20 Value Shed in naval going to Nashville 37211. Please check the HOA packet and reply with what is missing.

Thanks,
Harper', 'manual', null, now() - interval '834 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 33, 'facebook', 'model', 'Hi Harper, saw your note on a concrete apron in front of the doors. For the 14x20 Value Shed in Nashville I will move the deposit request to Friday.', 'manual', null, now() - interval '786 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 34, 'telegram', 'user', 'Harper via Telegram. The deposit timing before the build slot is the open item on the 14x20 Value Shed for 37211. Please confirm the crew can stage from the alley.', 'manual', null, now() - interval '738 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 35, 'sms', 'model', 'Hi Harper. On holding the build for a June delivery, I can quote the ramp as a separate line for the 14x20 Value Shed headed to Nashville.', 'ai', null, now() - interval '690 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 36, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about the invoice address for the co-buyer for the 14x20 Value Shed in naval going to Nashville 37211. Please lock the color so the siding order can go out.

Thanks,
Harper', 'manual', null, now() - interval '642 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 37, 'facebook', 'model', 'Hi Harper, saw your note on a spare key for the side door. For the 14x20 Value Shed in Nashville I will send photos of the same building in that color.', 'manual', null, now() - interval '594 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 38, 'telegram', 'user', 'Harper via Telegram. The warranty card after install is the open item on the 14x20 Value Shed for 37211. Please update the co-buyer on the shared deal.', 'manual', null, now() - interval '546 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 39, 'sms', 'model', 'Hi Harper. On confirming the site is free of overhead lines, I can put the signed page back in the packet for the 14x20 Value Shed headed to Nashville.', 'manual', null, now() - interval '498 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 40, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about whether the gravel pad needs to be six inches above grade for the 14x20 Value Shed in naval going to Nashville 37211. Please hold the build slot until the pad is inspected.

Thanks,
Harper', 'manual', null, now() - interval '450 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 41, 'facebook', 'model', 'Hi Harper, saw your note on moving the loft ladder to the left wall. For the 14x20 Value Shed in Nashville I will price that option on the next revision.', 'ai', null, now() - interval '402 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 42, 'telegram', 'user', 'Harper via Telegram. A ridge vent instead of gable vents is the open item on the 14x20 Value Shed for 37211. Please text the delivery window once the shop confirms it.', 'manual', null, now() - interval '354 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 43, 'sms', 'model', 'Hi Harper. On keeping the double doors from swinging into the fence, I can email the itemized total with tax for this ZIP for the 14x20 Value Shed headed to Nashville.', 'manual', null, now() - interval '306 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 44, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about the electrical stub-out on the back wall for the 14x20 Value Shed in naval going to Nashville 37211. Please note it on the work order before the panels are cut.

Thanks,
Harper', 'manual', null, now() - interval '258 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 45, 'facebook', 'model', 'Hi Harper, saw your note on a wider ramp for the lawn tractor. For the 14x20 Value Shed in Nashville I will ask the driver to walk the path the day before.', 'manual', null, now() - interval '210 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 46, 'telegram', 'user', 'Harper via Telegram. Staining the ramp boards before delivery is the open item on the 14x20 Value Shed for 37211. Please leave that line off the contract until we measure.', 'manual', null, now() - interval '162 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 47, 'call', 'model', 'Outbound call with Harper about the anchor kit for the wind rating for the 14x20 Value Shed in Nashville. Agreed to add it as a site note rather than a factory change.', 'ai', '66666666-6666-4666-8666-000000000004'::uuid, now() - interval '114 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 48, 'email', 'user', 'Hi TimberCraft,

This is Harper. I am writing about adding a workbench along the right wall for the 14x20 Value Shed in naval going to Nashville 37211. Please schedule a five-minute call after lunch.

Thanks,
Harper', 'manual', null, now() - interval '66 minutes'),
  ('44444444-4444-4444-8444-444444444409'::uuid, 49, 'facebook', 'model', 'Hi Harper, saw your note on the window placement above the potting bench. For the 14x20 Value Shed in Nashville I will send the financing breakdown without the loft.', 'manual', null, now() - interval '18 minutes'),
  ('44444444-4444-4444-8444-444444444410'::uuid, 0, 'facebook', 'user', 'Mateo on Facebook: I still need an answer on a taller wall so the mower deck clears before we lock the 14x20 Value Shed for Nashville. Can you keep the current revision and only update the note?', 'manual', null, now() - interval '1796 minutes'),
  ('44444444-4444-4444-8444-444444444410'::uuid, 1, 'call', 'user', 'Mateo called in about the moisture barrier under the floor on the 14x20 Value Shed headed to Nashville 37211. They want us to check the HOA packet and reply with what is missing.', 'manual', '66666666-6666-4666-8666-000000000005'::uuid, now() - interval '1737 minutes'),
  ('44444444-4444-4444-8444-444444444410'::uuid, 2, 'sms', 'user', 'Mateo here. Quick question on replacing one window with a solid panel for the 14x20 Value Shed shipping to Nashville. Can you move the deposit request to Friday?', 'manual', null, now() - interval '1678 minutes'),
  ('44444444-4444-4444-8444-444444444410'::uuid, 3, 'email', 'model', 'Hi Mateo,

Following up on the permit drawing for the homeowners association for your 14x20 Value Shed in Nashville. I can confirm the crew can stage from the alley and send the updated naval numbers today.

TimberCraft', 'manual', null, now() - interval '1619 minutes'),
  ('44444444-4444-4444-8444-444444444410'::uuid, 4, 'facebook', 'user', 'Mateo on Facebook: I still need an answer on a side entry so the garden path stays open before we lock the 14x20 Value Shed for Nashville. Can you quote the ramp as a separate line?', 'manual', null, now() - interval '1560 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 0, 'telegram', 'user', 'Camille via Telegram. The color match between the trim and the porch posts is the open item on the 14x20 Value Shed for 37211. Please lock the color so the siding order can go out.', 'manual', null, now() - interval '5090 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 1, 'call', 'model', 'Outbound call with Camille about shelving cleats at 16 inches on center for the 14x20 Value Shed in Nashville. Agreed to send photos of the same building in that color.', 'manual', '66666666-6666-4666-8666-000000000006'::uuid, now() - interval '5020 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 2, 'email', 'user', 'Hi TimberCraft,

This is Camille. I am writing about a lockable loft hatch for the 14x20 Value Shed in naval going to Nashville 37211. Please update the co-buyer on the shared deal.

Thanks,
Camille', 'manual', null, now() - interval '4950 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 3, 'facebook', 'model', 'Hi Camille, saw your note on the delivery truck clearance on the alley. For the 14x20 Value Shed in Nashville I will put the signed page back in the packet.', 'manual', null, now() - interval '4880 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 4, 'telegram', 'user', 'Camille via Telegram. Pouring the piers before the crew arrives is the open item on the 14x20 Value Shed for 37211. Please send a revised drawing with that change marked.', 'manual', null, now() - interval '4810 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 5, 'sms', 'model', 'Hi Camille. On a metal threshold at the doorway, I can hold the build slot until the pad is inspected for the 14x20 Value Shed headed to Nashville.', 'ai', null, now() - interval '4740 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 6, 'email', 'user', 'Hi TimberCraft,

This is Camille. I am writing about the gutter downspout landing away from the pad for the 14x20 Value Shed in naval going to Nashville 37211. Please price that option on the next revision.

Thanks,
Camille', 'manual', null, now() - interval '4670 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 7, 'facebook', 'model', 'Hi Camille, saw your note on an extra tie-down at the back corners. For the 14x20 Value Shed in Nashville I will text the delivery window once the shop confirms it.', 'manual', null, now() - interval '4600 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 8, 'telegram', 'user', 'Camille via Telegram. The interior height under the loft is the open item on the 14x20 Value Shed for 37211. Please email the itemized total with tax for this ZIP.', 'manual', null, now() - interval '4530 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 9, 'call', 'model', 'Outbound call with Camille about a Dutch door on the front only for the 14x20 Value Shed in Nashville. Agreed to note it on the work order before the panels are cut.', 'manual', '66666666-6666-4666-8666-000000000007'::uuid, now() - interval '4460 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 10, 'email', 'user', 'Hi TimberCraft,

This is Camille. I am writing about the skylight option over the work area for the 14x20 Value Shed in naval going to Nashville 37211. Please ask the driver to walk the path the day before.

Thanks,
Camille', 'manual', null, now() - interval '4390 minutes'),
  ('44444444-4444-4444-8444-444444444411'::uuid, 11, 'facebook', 'model', 'Hi Camille, saw your note on keeping the floor untreated for a later epoxy coat. For the 14x20 Value Shed in Nashville I will leave that line off the contract until we measure.', 'ai', null, now() - interval '4320 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 0, 'sms', 'user', 'Owen here. Quick question on the setback from the property line for the 12x24 Value Barn shipping to Austin. Can you add it as a site note rather than a factory change?', 'manual', null, now() - interval '7137 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 1, 'call', 'user', 'Owen called in about a flower-box shelf under the front window on the 12x24 Value Barn headed to Austin 78704. They want us to schedule a five-minute call after lunch.', 'manual', '66666666-6666-4666-8666-000000000008'::uuid, now() - interval '7056 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 2, 'facebook', 'user', 'Owen on Facebook: I still need an answer on the ramp slope for a wheelbarrow before we lock the 12x24 Value Barn for Austin. Can you send the financing breakdown without the loft?', 'manual', null, now() - interval '6975 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 3, 'telegram', 'model', 'Owen, Telegram update on moving the vent so it misses the neighbor''s maple: the 12x24 Value Barn for 78704 can stay on track if I keep the current revision and only update the note.', 'manual', null, now() - interval '6894 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 4, 'sms', 'user', 'Owen here. Quick question on a partition wall for a small office nook for the 12x24 Value Barn shipping to Austin. Can you check the HOA packet and reply with what is missing?', 'manual', null, now() - interval '6813 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 5, 'email', 'model', 'Hi Owen,

Following up on the shutter color against the siding sample for your 12x24 Value Barn in Austin. I can move the deposit request to Friday and send the updated red barn numbers today.

TimberCraft', 'ai', null, now() - interval '6732 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 6, 'facebook', 'user', 'Owen on Facebook: I still need an answer on a concrete apron in front of the doors before we lock the 12x24 Value Barn for Austin. Can you confirm the crew can stage from the alley?', 'manual', null, now() - interval '6651 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 7, 'telegram', 'model', 'Owen, Telegram update on the deposit timing before the build slot: the 12x24 Value Barn for 78704 can stay on track if I quote the ramp as a separate line.', 'manual', null, now() - interval '6570 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 8, 'sms', 'user', 'Owen here. Quick question on holding the build for a June delivery for the 12x24 Value Barn shipping to Austin. Can you lock the color so the siding order can go out?', 'manual', null, now() - interval '6489 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 9, 'email', 'model', 'Hi Owen,

Following up on the invoice address for the co-buyer for your 12x24 Value Barn in Austin. I can send photos of the same building in that color and send the updated red barn numbers today.

TimberCraft', 'manual', null, now() - interval '6408 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 10, 'facebook', 'user', 'Owen on Facebook: I still need an answer on a spare key for the side door before we lock the 12x24 Value Barn for Austin. Can you update the co-buyer on the shared deal?', 'manual', null, now() - interval '6327 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 11, 'telegram', 'model', 'Owen, Telegram update on the warranty card after install: the 12x24 Value Barn for 78704 can stay on track if I put the signed page back in the packet.', 'ai', null, now() - interval '6246 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 12, 'sms', 'user', 'Owen here. Quick question on confirming the site is free of overhead lines for the 12x24 Value Barn shipping to Austin. Can you send a revised drawing with that change marked?', 'manual', null, now() - interval '6165 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 13, 'email', 'model', 'Hi Owen,

Following up on whether the gravel pad needs to be six inches above grade for your 12x24 Value Barn in Austin. I can price that option on the next revision and send the updated red barn numbers today.

TimberCraft', 'manual', null, now() - interval '6084 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 14, 'facebook', 'user', 'Owen on Facebook: I still need an answer on moving the loft ladder to the left wall before we lock the 12x24 Value Barn for Austin. Can you text the delivery window once the shop confirms it?', 'manual', null, now() - interval '6003 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 15, 'call', 'user', 'Owen called in about a ridge vent instead of gable vents on the 12x24 Value Barn headed to Austin 78704. They want us to email the itemized total with tax for this ZIP.', 'manual', '66666666-6666-4666-8666-000000000009'::uuid, now() - interval '5922 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 16, 'sms', 'user', 'Owen here. Quick question on keeping the double doors from swinging into the fence for the 12x24 Value Barn shipping to Austin. Can you note it on the work order before the panels are cut?', 'manual', null, now() - interval '5841 minutes'),
  ('44444444-4444-4444-8444-444444444412'::uuid, 17, 'email', 'model', 'Hi Owen,

Following up on the electrical stub-out on the back wall for your 12x24 Value Barn in Austin. I can ask the driver to walk the path the day before and send the updated red barn numbers today.

TimberCraft', 'ai', null, now() - interval '5760 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 0, 'email', 'user', 'Hi TimberCraft,

This is Fatima. I am writing about a wider ramp for the lawn tractor for the 12x24 Value Barn in red barn going to Austin 78704. Please leave that line off the contract until we measure.

Thanks,
Fatima', 'manual', null, now() - interval '9592 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 1, 'call', 'model', 'Outbound call with Fatima about staining the ramp boards before delivery for the 12x24 Value Barn in Austin. Agreed to add it as a site note rather than a factory change.', 'manual', '66666666-6666-4666-8666-000000000010'::uuid, now() - interval '9500 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 2, 'telegram', 'user', 'Fatima via Telegram. The anchor kit for the wind rating is the open item on the 12x24 Value Barn for 78704. Please schedule a five-minute call after lunch.', 'manual', null, now() - interval '9408 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 3, 'sms', 'model', 'Hi Fatima. On adding a workbench along the right wall, I can send the financing breakdown without the loft for the 12x24 Value Barn headed to Austin.', 'manual', null, now() - interval '9316 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 4, 'email', 'user', 'Hi TimberCraft,

This is Fatima. I am writing about the window placement above the potting bench for the 12x24 Value Barn in red barn going to Austin 78704. Please keep the current revision and only update the note.

Thanks,
Fatima', 'manual', null, now() - interval '9224 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 5, 'facebook', 'model', 'Hi Fatima, saw your note on a taller wall so the mower deck clears. For the 12x24 Value Barn in Austin I will check the HOA packet and reply with what is missing.', 'ai', null, now() - interval '9132 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 6, 'telegram', 'user', 'Fatima via Telegram. The moisture barrier under the floor is the open item on the 12x24 Value Barn for 78704. Please move the deposit request to Friday.', 'manual', null, now() - interval '9040 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 7, 'sms', 'model', 'Hi Fatima. On replacing one window with a solid panel, I can confirm the crew can stage from the alley for the 12x24 Value Barn headed to Austin.', 'manual', null, now() - interval '8948 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 8, 'email', 'user', 'Hi TimberCraft,

This is Fatima. I am writing about the permit drawing for the homeowners association for the 12x24 Value Barn in red barn going to Austin 78704. Please quote the ramp as a separate line.

Thanks,
Fatima', 'manual', null, now() - interval '8856 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 9, 'facebook', 'model', 'Hi Fatima, saw your note on a side entry so the garden path stays open. For the 12x24 Value Barn in Austin I will lock the color so the siding order can go out.', 'manual', null, now() - interval '8764 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 10, 'telegram', 'user', 'Fatima via Telegram. The color match between the trim and the porch posts is the open item on the 12x24 Value Barn for 78704. Please send photos of the same building in that color.', 'manual', null, now() - interval '8672 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 11, 'sms', 'model', 'Hi Fatima. On shelving cleats at 16 inches on center, I can update the co-buyer on the shared deal for the 12x24 Value Barn headed to Austin.', 'ai', null, now() - interval '8580 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 12, 'email', 'user', 'Hi TimberCraft,

This is Fatima. I am writing about a lockable loft hatch for the 12x24 Value Barn in red barn going to Austin 78704. Please put the signed page back in the packet.

Thanks,
Fatima', 'manual', null, now() - interval '8488 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 13, 'call', 'model', 'Outbound call with Fatima about the delivery truck clearance on the alley for the 12x24 Value Barn in Austin. Agreed to send a revised drawing with that change marked.', 'manual', '66666666-6666-4666-8666-000000000011'::uuid, now() - interval '8396 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 14, 'telegram', 'user', 'Fatima via Telegram. Pouring the piers before the crew arrives is the open item on the 12x24 Value Barn for 78704. Please hold the build slot until the pad is inspected.', 'manual', null, now() - interval '8304 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 15, 'sms', 'model', 'Hi Fatima. On a metal threshold at the doorway, I can price that option on the next revision for the 12x24 Value Barn headed to Austin.', 'manual', null, now() - interval '8212 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 16, 'email', 'user', 'Hi TimberCraft,

This is Fatima. I am writing about the gutter downspout landing away from the pad for the 12x24 Value Barn in red barn going to Austin 78704. Please text the delivery window once the shop confirms it.

Thanks,
Fatima', 'manual', null, now() - interval '8120 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 17, 'facebook', 'model', 'Hi Fatima, saw your note on an extra tie-down at the back corners. For the 12x24 Value Barn in Austin I will email the itemized total with tax for this ZIP.', 'ai', null, now() - interval '8028 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 18, 'telegram', 'user', 'Fatima via Telegram. The interior height under the loft is the open item on the 12x24 Value Barn for 78704. Please note it on the work order before the panels are cut.', 'manual', null, now() - interval '7936 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 19, 'sms', 'model', 'Hi Fatima. On a Dutch door on the front only, I can ask the driver to walk the path the day before for the 12x24 Value Barn headed to Austin.', 'manual', null, now() - interval '7844 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 20, 'email', 'user', 'Hi TimberCraft,

This is Fatima. I am writing about the skylight option over the work area for the 12x24 Value Barn in red barn going to Austin 78704. Please leave that line off the contract until we measure.

Thanks,
Fatima', 'manual', null, now() - interval '7752 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 21, 'facebook', 'model', 'Hi Fatima, saw your note on keeping the floor untreated for a later epoxy coat. For the 12x24 Value Barn in Austin I will add it as a site note rather than a factory change.', 'manual', null, now() - interval '7660 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 22, 'telegram', 'user', 'Fatima via Telegram. The setback from the property line is the open item on the 12x24 Value Barn for 78704. Please schedule a five-minute call after lunch.', 'manual', null, now() - interval '7568 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 23, 'sms', 'model', 'Hi Fatima. On a flower-box shelf under the front window, I can send the financing breakdown without the loft for the 12x24 Value Barn headed to Austin.', 'ai', null, now() - interval '7476 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 24, 'call', 'user', 'Fatima called in about the ramp slope for a wheelbarrow on the 12x24 Value Barn headed to Austin 78704. They want us to keep the current revision and only update the note.', 'manual', '66666666-6666-4666-8666-000000000012'::uuid, now() - interval '7384 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 25, 'facebook', 'model', 'Hi Fatima, saw your note on moving the vent so it misses the neighbor''s maple. For the 12x24 Value Barn in Austin I will check the HOA packet and reply with what is missing.', 'manual', null, now() - interval '7292 minutes'),
  ('44444444-4444-4444-8444-444444444413'::uuid, 26, 'telegram', 'user', 'Fatima via Telegram. A partition wall for a small office nook is the open item on the 12x24 Value Barn for 78704. Please move the deposit request to Friday.', 'manual', null, now() - interval '7200 minutes'),
  ('44444444-4444-4444-8444-444444444414'::uuid, 0, 'facebook', 'user', 'Leo on Facebook: I still need an answer on the shutter color against the siding sample before we lock the 10x16 Garden Shed for San Francisco. Can you confirm the crew can stage from the alley?', 'manual', null, now() - interval '9361 minutes'),
  ('44444444-4444-4444-8444-444444444414'::uuid, 1, 'call', 'user', 'Leo called in about a concrete apron in front of the doors on the 10x16 Garden Shed headed to San Francisco 94110. They want us to quote the ramp as a separate line.', 'manual', '66666666-6666-4666-8666-000000000013'::uuid, now() - interval '9258 minutes'),
  ('44444444-4444-4444-8444-444444444414'::uuid, 2, 'sms', 'user', 'Leo here. Quick question on the deposit timing before the build slot for the 10x16 Garden Shed shipping to San Francisco. Can you lock the color so the siding order can go out?', 'manual', null, now() - interval '9155 minutes'),
  ('44444444-4444-4444-8444-444444444414'::uuid, 3, 'email', 'model', 'Hi Leo,

Following up on holding the build for a June delivery for your 10x16 Garden Shed in San Francisco. I can send photos of the same building in that color and send the updated pewter green numbers today.

TimberCraft', 'manual', null, now() - interval '9052 minutes'),
  ('44444444-4444-4444-8444-444444444414'::uuid, 4, 'facebook', 'user', 'Leo on Facebook: I still need an answer on the invoice address for the co-buyer before we lock the 10x16 Garden Shed for San Francisco. Can you update the co-buyer on the shared deal?', 'manual', null, now() - interval '8949 minutes'),
  ('44444444-4444-4444-8444-444444444414'::uuid, 5, 'telegram', 'model', 'Leo, Telegram update on a spare key for the side door: the 10x16 Garden Shed for 94110 can stay on track if I put the signed page back in the packet.', 'ai', null, now() - interval '8846 minutes'),
  ('44444444-4444-4444-8444-444444444414'::uuid, 6, 'sms', 'user', 'Leo here. Quick question on the warranty card after install for the 10x16 Garden Shed shipping to San Francisco. Can you send a revised drawing with that change marked?', 'manual', null, now() - interval '8743 minutes'),
  ('44444444-4444-4444-8444-444444444414'::uuid, 7, 'email', 'model', 'Hi Leo,

Following up on confirming the site is free of overhead lines for your 10x16 Garden Shed in San Francisco. I can hold the build slot until the pad is inspected and send the updated pewter green numbers today.

TimberCraft', 'manual', null, now() - interval '8640 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 0, 'telegram', 'user', 'Sienna via Telegram. Whether the gravel pad needs to be six inches above grade is the open item on the 10x16 Garden Shed for 94110. Please text the delivery window once the shop confirms it.', 'manual', null, now() - interval '14144 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 1, 'call', 'model', 'Outbound call with Sienna about moving the loft ladder to the left wall for the 10x16 Garden Shed in San Francisco. Agreed to email the itemized total with tax for this ZIP.', 'manual', '66666666-6666-4666-8666-000000000014'::uuid, now() - interval '14107 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 2, 'email', 'user', 'Hi TimberCraft,

This is Sienna. I am writing about a ridge vent instead of gable vents for the 10x16 Garden Shed in pewter green going to San Francisco 94110. Please note it on the work order before the panels are cut.

Thanks,
Sienna', 'manual', null, now() - interval '14070 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 3, 'facebook', 'model', 'Hi Sienna, saw your note on keeping the double doors from swinging into the fence. For the 10x16 Garden Shed in San Francisco I will ask the driver to walk the path the day before.', 'manual', null, now() - interval '14033 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 4, 'telegram', 'user', 'Sienna via Telegram. The electrical stub-out on the back wall is the open item on the 10x16 Garden Shed for 94110. Please leave that line off the contract until we measure.', 'manual', null, now() - interval '13996 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 5, 'sms', 'model', 'Hi Sienna. On a wider ramp for the lawn tractor, I can add it as a site note rather than a factory change for the 10x16 Garden Shed headed to San Francisco.', 'ai', null, now() - interval '13959 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 6, 'email', 'user', 'Hi TimberCraft,

This is Sienna. I am writing about staining the ramp boards before delivery for the 10x16 Garden Shed in pewter green going to San Francisco 94110. Please schedule a five-minute call after lunch.

Thanks,
Sienna', 'manual', null, now() - interval '13922 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 7, 'facebook', 'model', 'Hi Sienna, saw your note on the anchor kit for the wind rating. For the 10x16 Garden Shed in San Francisco I will send the financing breakdown without the loft.', 'manual', null, now() - interval '13885 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 8, 'telegram', 'user', 'Sienna via Telegram. Adding a workbench along the right wall is the open item on the 10x16 Garden Shed for 94110. Please keep the current revision and only update the note.', 'manual', null, now() - interval '13848 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 9, 'sms', 'model', 'Hi Sienna. On the window placement above the potting bench, I can check the HOA packet and reply with what is missing for the 10x16 Garden Shed headed to San Francisco.', 'manual', null, now() - interval '13811 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 10, 'email', 'user', 'Hi TimberCraft,

This is Sienna. I am writing about a taller wall so the mower deck clears for the 10x16 Garden Shed in pewter green going to San Francisco 94110. Please move the deposit request to Friday.

Thanks,
Sienna', 'manual', null, now() - interval '13774 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 11, 'facebook', 'model', 'Hi Sienna, saw your note on the moisture barrier under the floor. For the 10x16 Garden Shed in San Francisco I will confirm the crew can stage from the alley.', 'ai', null, now() - interval '13737 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 12, 'telegram', 'user', 'Sienna via Telegram. Replacing one window with a solid panel is the open item on the 10x16 Garden Shed for 94110. Please quote the ramp as a separate line.', 'manual', null, now() - interval '13700 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 13, 'sms', 'model', 'Hi Sienna. On the permit drawing for the homeowners association, I can lock the color so the siding order can go out for the 10x16 Garden Shed headed to San Francisco.', 'manual', null, now() - interval '13663 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 14, 'email', 'user', 'Hi TimberCraft,

This is Sienna. I am writing about a side entry so the garden path stays open for the 10x16 Garden Shed in pewter green going to San Francisco 94110. Please send photos of the same building in that color.

Thanks,
Sienna', 'manual', null, now() - interval '13626 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 15, 'facebook', 'model', 'Hi Sienna, saw your note on the color match between the trim and the porch posts. For the 10x16 Garden Shed in San Francisco I will update the co-buyer on the shared deal.', 'manual', null, now() - interval '13589 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 16, 'call', 'user', 'Sienna called in about shelving cleats at 16 inches on center on the 10x16 Garden Shed headed to San Francisco 94110. They want us to put the signed page back in the packet.', 'manual', '66666666-6666-4666-8666-000000000015'::uuid, now() - interval '13552 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 17, 'sms', 'model', 'Hi Sienna. On a lockable loft hatch, I can send a revised drawing with that change marked for the 10x16 Garden Shed headed to San Francisco.', 'ai', null, now() - interval '13515 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 18, 'email', 'user', 'Hi TimberCraft,

This is Sienna. I am writing about the delivery truck clearance on the alley for the 10x16 Garden Shed in pewter green going to San Francisco 94110. Please hold the build slot until the pad is inspected.

Thanks,
Sienna', 'manual', null, now() - interval '13478 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 19, 'facebook', 'model', 'Hi Sienna, saw your note on pouring the piers before the crew arrives. For the 10x16 Garden Shed in San Francisco I will price that option on the next revision.', 'manual', null, now() - interval '13441 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 20, 'telegram', 'user', 'Sienna via Telegram. A metal threshold at the doorway is the open item on the 10x16 Garden Shed for 94110. Please text the delivery window once the shop confirms it.', 'manual', null, now() - interval '13404 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 21, 'sms', 'model', 'Hi Sienna. On the gutter downspout landing away from the pad, I can email the itemized total with tax for this ZIP for the 10x16 Garden Shed headed to San Francisco.', 'manual', null, now() - interval '13367 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 22, 'email', 'user', 'Hi TimberCraft,

This is Sienna. I am writing about an extra tie-down at the back corners for the 10x16 Garden Shed in pewter green going to San Francisco 94110. Please note it on the work order before the panels are cut.

Thanks,
Sienna', 'manual', null, now() - interval '13330 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 23, 'facebook', 'model', 'Hi Sienna, saw your note on the interior height under the loft. For the 10x16 Garden Shed in San Francisco I will ask the driver to walk the path the day before.', 'ai', null, now() - interval '13293 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 24, 'telegram', 'user', 'Sienna via Telegram. A Dutch door on the front only is the open item on the 10x16 Garden Shed for 94110. Please leave that line off the contract until we measure.', 'manual', null, now() - interval '13256 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 25, 'sms', 'model', 'Hi Sienna. On the skylight option over the work area, I can add it as a site note rather than a factory change for the 10x16 Garden Shed headed to San Francisco.', 'manual', null, now() - interval '13219 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 26, 'email', 'user', 'Hi TimberCraft,

This is Sienna. I am writing about keeping the floor untreated for a later epoxy coat for the 10x16 Garden Shed in pewter green going to San Francisco 94110. Please schedule a five-minute call after lunch.

Thanks,
Sienna', 'manual', null, now() - interval '13182 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 27, 'facebook', 'model', 'Hi Sienna, saw your note on the setback from the property line. For the 10x16 Garden Shed in San Francisco I will send the financing breakdown without the loft.', 'manual', null, now() - interval '13145 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 28, 'telegram', 'user', 'Sienna via Telegram. A flower-box shelf under the front window is the open item on the 10x16 Garden Shed for 94110. Please keep the current revision and only update the note.', 'manual', null, now() - interval '13108 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 29, 'sms', 'model', 'Hi Sienna. On the ramp slope for a wheelbarrow, I can check the HOA packet and reply with what is missing for the 10x16 Garden Shed headed to San Francisco.', 'ai', null, now() - interval '13071 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 30, 'call', 'user', 'Sienna called in about moving the vent so it misses the neighbor''s maple on the 10x16 Garden Shed headed to San Francisco 94110. They want us to move the deposit request to Friday.', 'manual', '66666666-6666-4666-8666-000000000016'::uuid, now() - interval '13034 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 31, 'facebook', 'model', 'Hi Sienna, saw your note on a partition wall for a small office nook. For the 10x16 Garden Shed in San Francisco I will confirm the crew can stage from the alley.', 'manual', null, now() - interval '12997 minutes'),
  ('44444444-4444-4444-8444-444444444415'::uuid, 32, 'telegram', 'user', 'Sienna via Telegram. The shutter color against the siding sample is the open item on the 10x16 Garden Shed for 94110. Please quote the ramp as a separate line.', 'manual', null, now() - interval '12960 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 0, 'sms', 'user', 'Andre here. Quick question on a concrete apron in front of the doors for the 12x20 Mini Barn shipping to New York. Can you lock the color so the siding order can go out?', 'manual', null, now() - interval '20832 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 1, 'call', 'user', 'Andre called in about the deposit timing before the build slot on the 12x20 Mini Barn headed to New York 10011. They want us to send photos of the same building in that color.', 'manual', '66666666-6666-4666-8666-000000000017'::uuid, now() - interval '20784 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 2, 'facebook', 'user', 'Andre on Facebook: I still need an answer on holding the build for a June delivery before we lock the 12x20 Mini Barn for New York. Can you update the co-buyer on the shared deal?', 'manual', null, now() - interval '20736 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 3, 'telegram', 'model', 'Andre, Telegram update on the invoice address for the co-buyer: the 12x20 Mini Barn for 10011 can stay on track if I put the signed page back in the packet.', 'manual', null, now() - interval '20688 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 4, 'sms', 'user', 'Andre here. Quick question on a spare key for the side door for the 12x20 Mini Barn shipping to New York. Can you send a revised drawing with that change marked?', 'manual', null, now() - interval '20640 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 5, 'email', 'model', 'Hi Andre,

Following up on the warranty card after install for your 12x20 Mini Barn in New York. I can hold the build slot until the pad is inspected and send the updated urbane bronze numbers today.

TimberCraft', 'ai', null, now() - interval '20592 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 6, 'facebook', 'user', 'Andre on Facebook: I still need an answer on confirming the site is free of overhead lines before we lock the 12x20 Mini Barn for New York. Can you price that option on the next revision?', 'manual', null, now() - interval '20544 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 7, 'telegram', 'model', 'Andre, Telegram update on whether the gravel pad needs to be six inches above grade: the 12x20 Mini Barn for 10011 can stay on track if I email the itemized total with tax for this ZIP.', 'manual', null, now() - interval '20496 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 8, 'sms', 'user', 'Andre here. Quick question on moving the loft ladder to the left wall for the 12x20 Mini Barn shipping to New York. Can you note it on the work order before the panels are cut?', 'manual', null, now() - interval '20448 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 9, 'email', 'model', 'Hi Andre,

Following up on a ridge vent instead of gable vents for your 12x20 Mini Barn in New York. I can ask the driver to walk the path the day before and send the updated urbane bronze numbers today.

TimberCraft', 'manual', null, now() - interval '20400 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 10, 'facebook', 'user', 'Andre on Facebook: I still need an answer on keeping the double doors from swinging into the fence before we lock the 12x20 Mini Barn for New York. Can you leave that line off the contract until we measure?', 'manual', null, now() - interval '20352 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 11, 'telegram', 'model', 'Andre, Telegram update on the electrical stub-out on the back wall: the 12x20 Mini Barn for 10011 can stay on track if I add it as a site note rather than a factory change.', 'ai', null, now() - interval '20304 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 12, 'call', 'model', 'Outbound call with Andre about a wider ramp for the lawn tractor for the 12x20 Mini Barn in New York. Agreed to schedule a five-minute call after lunch.', 'manual', '66666666-6666-4666-8666-000000000018'::uuid, now() - interval '20256 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 13, 'email', 'model', 'Hi Andre,

Following up on staining the ramp boards before delivery for your 12x20 Mini Barn in New York. I can send the financing breakdown without the loft and send the updated urbane bronze numbers today.

TimberCraft', 'manual', null, now() - interval '20208 minutes'),
  ('44444444-4444-4444-8444-444444444416'::uuid, 14, 'facebook', 'user', 'Andre on Facebook: I still need an answer on the anchor kit for the wind rating before we lock the 12x20 Mini Barn for New York. Can you keep the current revision and only update the note?', 'manual', null, now() - interval '20160 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 0, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about adding a workbench along the right wall for the 14x24 Chalet in biscuit going to Denver 80205. Please check the HOA packet and reply with what is missing.

Thanks,
Naomi', 'manual', null, now() - interval '2459 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 1, 'call', 'model', 'Outbound call with Naomi about the window placement above the potting bench for the 14x24 Chalet in Denver. Agreed to move the deposit request to Friday.', 'manual', '66666666-6666-4666-8666-000000000019'::uuid, now() - interval '2400 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 2, 'telegram', 'user', 'Naomi via Telegram. A taller wall so the mower deck clears is the open item on the 14x24 Chalet for 80205. Please confirm the crew can stage from the alley.', 'manual', null, now() - interval '2341 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 3, 'sms', 'model', 'Hi Naomi. On the moisture barrier under the floor, I can quote the ramp as a separate line for the 14x24 Chalet headed to Denver.', 'manual', null, now() - interval '2282 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 4, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about replacing one window with a solid panel for the 14x24 Chalet in biscuit going to Denver 80205. Please lock the color so the siding order can go out.

Thanks,
Naomi', 'manual', null, now() - interval '2223 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 5, 'facebook', 'model', 'Hi Naomi, saw your note on the permit drawing for the homeowners association. For the 14x24 Chalet in Denver I will send photos of the same building in that color.', 'ai', null, now() - interval '2164 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 6, 'telegram', 'user', 'Naomi via Telegram. A side entry so the garden path stays open is the open item on the 14x24 Chalet for 80205. Please update the co-buyer on the shared deal.', 'manual', null, now() - interval '2105 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 7, 'sms', 'model', 'Hi Naomi. On the color match between the trim and the porch posts, I can put the signed page back in the packet for the 14x24 Chalet headed to Denver.', 'manual', null, now() - interval '2046 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 8, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about shelving cleats at 16 inches on center for the 14x24 Chalet in biscuit going to Denver 80205. Please send a revised drawing with that change marked.

Thanks,
Naomi', 'manual', null, now() - interval '1987 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 9, 'facebook', 'model', 'Hi Naomi, saw your note on a lockable loft hatch. For the 14x24 Chalet in Denver I will hold the build slot until the pad is inspected.', 'manual', null, now() - interval '1928 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 10, 'telegram', 'user', 'Naomi via Telegram. The delivery truck clearance on the alley is the open item on the 14x24 Chalet for 80205. Please price that option on the next revision.', 'manual', null, now() - interval '1869 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 11, 'sms', 'model', 'Hi Naomi. On pouring the piers before the crew arrives, I can text the delivery window once the shop confirms it for the 14x24 Chalet headed to Denver.', 'ai', null, now() - interval '1810 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 12, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about a metal threshold at the doorway for the 14x24 Chalet in biscuit going to Denver 80205. Please email the itemized total with tax for this ZIP.

Thanks,
Naomi', 'manual', null, now() - interval '1751 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 13, 'facebook', 'model', 'Hi Naomi, saw your note on the gutter downspout landing away from the pad. For the 14x24 Chalet in Denver I will note it on the work order before the panels are cut.', 'manual', null, now() - interval '1692 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 14, 'telegram', 'user', 'Naomi via Telegram. An extra tie-down at the back corners is the open item on the 14x24 Chalet for 80205. Please ask the driver to walk the path the day before.', 'manual', null, now() - interval '1633 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 15, 'sms', 'model', 'Hi Naomi. On the interior height under the loft, I can leave that line off the contract until we measure for the 14x24 Chalet headed to Denver.', 'manual', null, now() - interval '1574 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 16, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about a Dutch door on the front only for the 14x24 Chalet in biscuit going to Denver 80205. Please add it as a site note rather than a factory change.

Thanks,
Naomi', 'manual', null, now() - interval '1515 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 17, 'facebook', 'model', 'Hi Naomi, saw your note on the skylight option over the work area. For the 14x24 Chalet in Denver I will schedule a five-minute call after lunch.', 'ai', null, now() - interval '1456 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 18, 'telegram', 'user', 'Naomi via Telegram. Keeping the floor untreated for a later epoxy coat is the open item on the 14x24 Chalet for 80205. Please send the financing breakdown without the loft.', 'manual', null, now() - interval '1397 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 19, 'sms', 'model', 'Hi Naomi. On the setback from the property line, I can keep the current revision and only update the note for the 14x24 Chalet headed to Denver.', 'manual', null, now() - interval '1338 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 20, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about a flower-box shelf under the front window for the 14x24 Chalet in biscuit going to Denver 80205. Please check the HOA packet and reply with what is missing.

Thanks,
Naomi', 'manual', null, now() - interval '1279 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 21, 'call', 'model', 'Outbound call with Naomi about the ramp slope for a wheelbarrow for the 14x24 Chalet in Denver. Agreed to move the deposit request to Friday.', 'manual', '66666666-6666-4666-8666-000000000020'::uuid, now() - interval '1220 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 22, 'telegram', 'user', 'Naomi via Telegram. Moving the vent so it misses the neighbor''s maple is the open item on the 14x24 Chalet for 80205. Please confirm the crew can stage from the alley.', 'manual', null, now() - interval '1161 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 23, 'sms', 'model', 'Hi Naomi. On a partition wall for a small office nook, I can quote the ramp as a separate line for the 14x24 Chalet headed to Denver.', 'ai', null, now() - interval '1102 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 24, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about the shutter color against the siding sample for the 14x24 Chalet in biscuit going to Denver 80205. Please lock the color so the siding order can go out.

Thanks,
Naomi', 'manual', null, now() - interval '1043 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 25, 'facebook', 'model', 'Hi Naomi, saw your note on a concrete apron in front of the doors. For the 14x24 Chalet in Denver I will send photos of the same building in that color.', 'manual', null, now() - interval '984 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 26, 'telegram', 'user', 'Naomi via Telegram. The deposit timing before the build slot is the open item on the 14x24 Chalet for 80205. Please update the co-buyer on the shared deal.', 'manual', null, now() - interval '925 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 27, 'sms', 'model', 'Hi Naomi. On holding the build for a June delivery, I can put the signed page back in the packet for the 14x24 Chalet headed to Denver.', 'manual', null, now() - interval '866 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 28, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about the invoice address for the co-buyer for the 14x24 Chalet in biscuit going to Denver 80205. Please send a revised drawing with that change marked.

Thanks,
Naomi', 'manual', null, now() - interval '807 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 29, 'facebook', 'model', 'Hi Naomi, saw your note on a spare key for the side door. For the 14x24 Chalet in Denver I will hold the build slot until the pad is inspected.', 'ai', null, now() - interval '748 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 30, 'telegram', 'user', 'Naomi via Telegram. The warranty card after install is the open item on the 14x24 Chalet for 80205. Please price that option on the next revision.', 'manual', null, now() - interval '689 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 31, 'sms', 'model', 'Hi Naomi. On confirming the site is free of overhead lines, I can text the delivery window once the shop confirms it for the 14x24 Chalet headed to Denver.', 'manual', null, now() - interval '630 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 32, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about whether the gravel pad needs to be six inches above grade for the 14x24 Chalet in biscuit going to Denver 80205. Please note it on the work order before the panels are cut.

Thanks,
Naomi', 'manual', null, now() - interval '571 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 33, 'facebook', 'model', 'Hi Naomi, saw your note on moving the loft ladder to the left wall. For the 14x24 Chalet in Denver I will ask the driver to walk the path the day before.', 'manual', null, now() - interval '512 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 34, 'telegram', 'user', 'Naomi via Telegram. A ridge vent instead of gable vents is the open item on the 14x24 Chalet for 80205. Please leave that line off the contract until we measure.', 'manual', null, now() - interval '453 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 35, 'sms', 'model', 'Hi Naomi. On keeping the double doors from swinging into the fence, I can add it as a site note rather than a factory change for the 14x24 Chalet headed to Denver.', 'ai', null, now() - interval '394 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 36, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about the electrical stub-out on the back wall for the 14x24 Chalet in biscuit going to Denver 80205. Please schedule a five-minute call after lunch.

Thanks,
Naomi', 'manual', null, now() - interval '335 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 37, 'facebook', 'model', 'Hi Naomi, saw your note on a wider ramp for the lawn tractor. For the 14x24 Chalet in Denver I will send the financing breakdown without the loft.', 'manual', null, now() - interval '276 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 38, 'telegram', 'user', 'Naomi via Telegram. Staining the ramp boards before delivery is the open item on the 14x24 Chalet for 80205. Please keep the current revision and only update the note.', 'manual', null, now() - interval '217 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 39, 'call', 'model', 'Outbound call with Naomi about the anchor kit for the wind rating for the 14x24 Chalet in Denver. Agreed to check the HOA packet and reply with what is missing.', 'manual', '66666666-6666-4666-8666-000000000021'::uuid, now() - interval '158 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 40, 'email', 'user', 'Hi TimberCraft,

This is Naomi. I am writing about adding a workbench along the right wall for the 14x24 Chalet in biscuit going to Denver 80205. Please move the deposit request to Friday.

Thanks,
Naomi', 'manual', null, now() - interval '99 minutes'),
  ('44444444-4444-4444-8444-444444444417'::uuid, 41, 'facebook', 'model', 'Hi Naomi, saw your note on the window placement above the potting bench. For the 14x24 Chalet in Denver I will confirm the crew can stage from the alley.', 'ai', null, now() - interval '40 minutes'),
  ('44444444-4444-4444-8444-444444444418'::uuid, 0, 'facebook', 'user', 'Theo on Facebook: I still need an answer on a taller wall so the mower deck clears before we lock the 12x28 Craftsman Dutch Barn for Seattle. Can you quote the ramp as a separate line?', 'manual', null, now() - interval '3230 minutes'),
  ('44444444-4444-4444-8444-444444444418'::uuid, 1, 'call', 'user', 'Theo called in about the moisture barrier under the floor on the 12x28 Craftsman Dutch Barn headed to Seattle 98101. They want us to lock the color so the siding order can go out.', 'manual', '66666666-6666-4666-8666-000000000022'::uuid, now() - interval '3160 minutes'),
  ('44444444-4444-4444-8444-444444444418'::uuid, 2, 'sms', 'user', 'Theo here. Quick question on replacing one window with a solid panel for the 12x28 Craftsman Dutch Barn shipping to Seattle. Can you send photos of the same building in that color?', 'manual', null, now() - interval '3090 minutes'),
  ('44444444-4444-4444-8444-444444444418'::uuid, 3, 'email', 'model', 'Hi Theo,

Following up on the permit drawing for the homeowners association for your 12x28 Craftsman Dutch Barn in Seattle. I can update the co-buyer on the shared deal and send the updated repose gray numbers today.

TimberCraft', 'manual', null, now() - interval '3020 minutes'),
  ('44444444-4444-4444-8444-444444444418'::uuid, 4, 'facebook', 'user', 'Theo on Facebook: I still need an answer on a side entry so the garden path stays open before we lock the 12x28 Craftsman Dutch Barn for Seattle. Can you put the signed page back in the packet?', 'manual', null, now() - interval '2950 minutes'),
  ('44444444-4444-4444-8444-444444444418'::uuid, 5, 'telegram', 'model', 'Theo, Telegram update on the color match between the trim and the porch posts: the 12x28 Craftsman Dutch Barn for 98101 can stay on track if I send a revised drawing with that change marked.', 'ai', null, now() - interval '2880 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 0, 'telegram', 'user', 'Ingrid via Telegram. Shelving cleats at 16 inches on center is the open item on the 10x20 Barn Porch for 97201. Please hold the build slot until the pad is inspected.', 'manual', null, now() - interval '30420 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 1, 'call', 'model', 'Outbound call with Ingrid about a lockable loft hatch for the 10x20 Barn Porch in Portland. Agreed to price that option on the next revision.', 'manual', '66666666-6666-4666-8666-000000000023'::uuid, now() - interval '30339 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 2, 'email', 'user', 'Hi TimberCraft,

This is Ingrid. I am writing about the delivery truck clearance on the alley for the 10x20 Barn Porch in favorite tan going to Portland 97201. Please text the delivery window once the shop confirms it.

Thanks,
Ingrid', 'manual', null, now() - interval '30258 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 3, 'facebook', 'model', 'Hi Ingrid, saw your note on pouring the piers before the crew arrives. For the 10x20 Barn Porch in Portland I will email the itemized total with tax for this ZIP.', 'manual', null, now() - interval '30177 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 4, 'telegram', 'user', 'Ingrid via Telegram. A metal threshold at the doorway is the open item on the 10x20 Barn Porch for 97201. Please note it on the work order before the panels are cut.', 'manual', null, now() - interval '30096 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 5, 'sms', 'model', 'Hi Ingrid. On the gutter downspout landing away from the pad, I can ask the driver to walk the path the day before for the 10x20 Barn Porch headed to Portland.', 'ai', null, now() - interval '30015 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 6, 'email', 'user', 'Hi TimberCraft,

This is Ingrid. I am writing about an extra tie-down at the back corners for the 10x20 Barn Porch in favorite tan going to Portland 97201. Please leave that line off the contract until we measure.

Thanks,
Ingrid', 'manual', null, now() - interval '29934 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 7, 'facebook', 'model', 'Hi Ingrid, saw your note on the interior height under the loft. For the 10x20 Barn Porch in Portland I will add it as a site note rather than a factory change.', 'manual', null, now() - interval '29853 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 8, 'telegram', 'user', 'Ingrid via Telegram. A Dutch door on the front only is the open item on the 10x20 Barn Porch for 97201. Please schedule a five-minute call after lunch.', 'manual', null, now() - interval '29772 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 9, 'sms', 'model', 'Hi Ingrid. On the skylight option over the work area, I can send the financing breakdown without the loft for the 10x20 Barn Porch headed to Portland.', 'manual', null, now() - interval '29691 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 10, 'email', 'user', 'Hi TimberCraft,

This is Ingrid. I am writing about keeping the floor untreated for a later epoxy coat for the 10x20 Barn Porch in favorite tan going to Portland 97201. Please keep the current revision and only update the note.

Thanks,
Ingrid', 'manual', null, now() - interval '29610 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 11, 'facebook', 'model', 'Hi Ingrid, saw your note on the setback from the property line. For the 10x20 Barn Porch in Portland I will check the HOA packet and reply with what is missing.', 'ai', null, now() - interval '29529 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 12, 'telegram', 'user', 'Ingrid via Telegram. A flower-box shelf under the front window is the open item on the 10x20 Barn Porch for 97201. Please move the deposit request to Friday.', 'manual', null, now() - interval '29448 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 13, 'sms', 'model', 'Hi Ingrid. On the ramp slope for a wheelbarrow, I can confirm the crew can stage from the alley for the 10x20 Barn Porch headed to Portland.', 'manual', null, now() - interval '29367 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 14, 'email', 'user', 'Hi TimberCraft,

This is Ingrid. I am writing about moving the vent so it misses the neighbor''s maple for the 10x20 Barn Porch in favorite tan going to Portland 97201. Please quote the ramp as a separate line.

Thanks,
Ingrid', 'manual', null, now() - interval '29286 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 15, 'facebook', 'model', 'Hi Ingrid, saw your note on a partition wall for a small office nook. For the 10x20 Barn Porch in Portland I will lock the color so the siding order can go out.', 'manual', null, now() - interval '29205 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 16, 'telegram', 'user', 'Ingrid via Telegram. The shutter color against the siding sample is the open item on the 10x20 Barn Porch for 97201. Please send photos of the same building in that color.', 'manual', null, now() - interval '29124 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 17, 'sms', 'model', 'Hi Ingrid. On a concrete apron in front of the doors, I can update the co-buyer on the shared deal for the 10x20 Barn Porch headed to Portland.', 'ai', null, now() - interval '29043 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 18, 'call', 'user', 'Ingrid called in about the deposit timing before the build slot on the 10x20 Barn Porch headed to Portland 97201. They want us to put the signed page back in the packet.', 'manual', '66666666-6666-4666-8666-000000000024'::uuid, now() - interval '28962 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 19, 'facebook', 'model', 'Hi Ingrid, saw your note on holding the build for a June delivery. For the 10x20 Barn Porch in Portland I will send a revised drawing with that change marked.', 'manual', null, now() - interval '28881 minutes'),
  ('44444444-4444-4444-8444-444444444419'::uuid, 20, 'telegram', 'user', 'Ingrid via Telegram. The invoice address for the co-buyer is the open item on the 10x20 Barn Porch for 97201. Please hold the build slot until the pad is inspected.', 'manual', null, now() - interval '28800 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 0, 'sms', 'user', 'Malik here. Quick question on a spare key for the side door for the 12x32 Metal Standard Cottage shipping to Minneapolis. Can you price that option on the next revision?', 'manual', null, now() - interval '89620 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 1, 'call', 'user', 'Malik called in about the warranty card after install on the 12x32 Metal Standard Cottage headed to Minneapolis 55401. They want us to text the delivery window once the shop confirms it.', 'manual', '66666666-6666-4666-8666-000000000025'::uuid, now() - interval '89528 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 2, 'facebook', 'user', 'Malik on Facebook: I still need an answer on confirming the site is free of overhead lines before we lock the 12x32 Metal Standard Cottage for Minneapolis. Can you email the itemized total with tax for this ZIP?', 'manual', null, now() - interval '89436 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 3, 'telegram', 'model', 'Malik, Telegram update on whether the gravel pad needs to be six inches above grade: the 12x32 Metal Standard Cottage for 55401 can stay on track if I ask the driver to walk the path the day before.', 'manual', null, now() - interval '89344 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 4, 'sms', 'user', 'Malik here. Quick question on moving the loft ladder to the left wall for the 12x32 Metal Standard Cottage shipping to Minneapolis. Can you leave that line off the contract until we measure?', 'manual', null, now() - interval '89252 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 5, 'email', 'model', 'Hi Malik,

Following up on a ridge vent instead of gable vents for your 12x32 Metal Standard Cottage in Minneapolis. I can add it as a site note rather than a factory change and send the updated cyberspace numbers today.

TimberCraft', 'ai', null, now() - interval '89160 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 6, 'facebook', 'user', 'Malik on Facebook: I still need an answer on keeping the double doors from swinging into the fence before we lock the 12x32 Metal Standard Cottage for Minneapolis. Can you schedule a five-minute call after lunch?', 'manual', null, now() - interval '89068 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 7, 'telegram', 'model', 'Malik, Telegram update on the electrical stub-out on the back wall: the 12x32 Metal Standard Cottage for 55401 can stay on track if I send the financing breakdown without the loft.', 'manual', null, now() - interval '88976 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 8, 'sms', 'user', 'Malik here. Quick question on a wider ramp for the lawn tractor for the 12x32 Metal Standard Cottage shipping to Minneapolis. Can you keep the current revision and only update the note?', 'manual', null, now() - interval '88884 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 9, 'email', 'model', 'Hi Malik,

Following up on staining the ramp boards before delivery for your 12x32 Metal Standard Cottage in Minneapolis. I can check the HOA packet and reply with what is missing and send the updated cyberspace numbers today.

TimberCraft', 'manual', null, now() - interval '88792 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 10, 'facebook', 'user', 'Malik on Facebook: I still need an answer on the anchor kit for the wind rating before we lock the 12x32 Metal Standard Cottage for Minneapolis. Can you move the deposit request to Friday?', 'manual', null, now() - interval '88700 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 11, 'telegram', 'model', 'Malik, Telegram update on adding a workbench along the right wall: the 12x32 Metal Standard Cottage for 55401 can stay on track if I confirm the crew can stage from the alley.', 'ai', null, now() - interval '88608 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 12, 'sms', 'user', 'Malik here. Quick question on the window placement above the potting bench for the 12x32 Metal Standard Cottage shipping to Minneapolis. Can you quote the ramp as a separate line?', 'manual', null, now() - interval '88516 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 13, 'email', 'model', 'Hi Malik,

Following up on a taller wall so the mower deck clears for your 12x32 Metal Standard Cottage in Minneapolis. I can lock the color so the siding order can go out and send the updated cyberspace numbers today.

TimberCraft', 'manual', null, now() - interval '88424 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 14, 'facebook', 'user', 'Malik on Facebook: I still need an answer on the moisture barrier under the floor before we lock the 12x32 Metal Standard Cottage for Minneapolis. Can you send photos of the same building in that color?', 'manual', null, now() - interval '88332 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 15, 'telegram', 'model', 'Malik, Telegram update on replacing one window with a solid panel: the 12x32 Metal Standard Cottage for 55401 can stay on track if I update the co-buyer on the shared deal.', 'manual', null, now() - interval '88240 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 16, 'sms', 'user', 'Malik here. Quick question on the permit drawing for the homeowners association for the 12x32 Metal Standard Cottage shipping to Minneapolis. Can you put the signed page back in the packet?', 'manual', null, now() - interval '88148 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 17, 'email', 'model', 'Hi Malik,

Following up on a side entry so the garden path stays open for your 12x32 Metal Standard Cottage in Minneapolis. I can send a revised drawing with that change marked and send the updated cyberspace numbers today.

TimberCraft', 'ai', null, now() - interval '88056 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 18, 'call', 'model', 'Outbound call with Malik about the color match between the trim and the porch posts for the 12x32 Metal Standard Cottage in Minneapolis. Agreed to hold the build slot until the pad is inspected.', 'manual', '66666666-6666-4666-8666-000000000026'::uuid, now() - interval '87964 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 19, 'telegram', 'model', 'Malik, Telegram update on shelving cleats at 16 inches on center: the 12x32 Metal Standard Cottage for 55401 can stay on track if I price that option on the next revision.', 'manual', null, now() - interval '87872 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 20, 'sms', 'user', 'Malik here. Quick question on a lockable loft hatch for the 12x32 Metal Standard Cottage shipping to Minneapolis. Can you text the delivery window once the shop confirms it?', 'manual', null, now() - interval '87780 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 21, 'email', 'model', 'Hi Malik,

Following up on the delivery truck clearance on the alley for your 12x32 Metal Standard Cottage in Minneapolis. I can email the itemized total with tax for this ZIP and send the updated cyberspace numbers today.

TimberCraft', 'manual', null, now() - interval '87688 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 22, 'facebook', 'user', 'Malik on Facebook: I still need an answer on pouring the piers before the crew arrives before we lock the 12x32 Metal Standard Cottage for Minneapolis. Can you note it on the work order before the panels are cut?', 'manual', null, now() - interval '87596 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 23, 'telegram', 'model', 'Malik, Telegram update on a metal threshold at the doorway: the 12x32 Metal Standard Cottage for 55401 can stay on track if I ask the driver to walk the path the day before.', 'ai', null, now() - interval '87504 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 24, 'sms', 'user', 'Malik here. Quick question on the gutter downspout landing away from the pad for the 12x32 Metal Standard Cottage shipping to Minneapolis. Can you leave that line off the contract until we measure?', 'manual', null, now() - interval '87412 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 25, 'email', 'model', 'Hi Malik,

Following up on an extra tie-down at the back corners for your 12x32 Metal Standard Cottage in Minneapolis. I can add it as a site note rather than a factory change and send the updated cyberspace numbers today.

TimberCraft', 'manual', null, now() - interval '87320 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 26, 'facebook', 'user', 'Malik on Facebook: I still need an answer on the interior height under the loft before we lock the 12x32 Metal Standard Cottage for Minneapolis. Can you schedule a five-minute call after lunch?', 'manual', null, now() - interval '87228 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 27, 'telegram', 'model', 'Malik, Telegram update on a Dutch door on the front only: the 12x32 Metal Standard Cottage for 55401 can stay on track if I send the financing breakdown without the loft.', 'manual', null, now() - interval '87136 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 28, 'sms', 'user', 'Malik here. Quick question on the skylight option over the work area for the 12x32 Metal Standard Cottage shipping to Minneapolis. Can you keep the current revision and only update the note?', 'manual', null, now() - interval '87044 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 29, 'email', 'model', 'Hi Malik,

Following up on keeping the floor untreated for a later epoxy coat for your 12x32 Metal Standard Cottage in Minneapolis. I can check the HOA packet and reply with what is missing and send the updated cyberspace numbers today.

TimberCraft', 'ai', null, now() - interval '86952 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 30, 'facebook', 'user', 'Malik on Facebook: I still need an answer on the setback from the property line before we lock the 12x32 Metal Standard Cottage for Minneapolis. Can you move the deposit request to Friday?', 'manual', null, now() - interval '86860 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 31, 'telegram', 'model', 'Malik, Telegram update on a flower-box shelf under the front window: the 12x32 Metal Standard Cottage for 55401 can stay on track if I confirm the crew can stage from the alley.', 'manual', null, now() - interval '86768 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 32, 'sms', 'user', 'Malik here. Quick question on the ramp slope for a wheelbarrow for the 12x32 Metal Standard Cottage shipping to Minneapolis. Can you quote the ramp as a separate line?', 'manual', null, now() - interval '86676 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 33, 'call', 'user', 'Malik called in about moving the vent so it misses the neighbor''s maple on the 12x32 Metal Standard Cottage headed to Minneapolis 55401. They want us to lock the color so the siding order can go out.', 'manual', '66666666-6666-4666-8666-000000000027'::uuid, now() - interval '86584 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 34, 'facebook', 'user', 'Malik on Facebook: I still need an answer on a partition wall for a small office nook before we lock the 12x32 Metal Standard Cottage for Minneapolis. Can you send photos of the same building in that color?', 'manual', null, now() - interval '86492 minutes'),
  ('44444444-4444-4444-8444-444444444420'::uuid, 35, 'telegram', 'model', 'Malik, Telegram update on the shutter color against the siding sample: the 12x32 Metal Standard Cottage for 55401 can stay on track if I update the co-buyer on the shared deal.', 'ai', null, now() - interval '86400 minutes'),
  ('44444444-4444-4444-8444-444444444421'::uuid, 0, 'email', 'user', 'Hi TimberCraft,

This is Ruby. I am writing about a concrete apron in front of the doors for the 12x24 Craftsman Cottage Porch in dovetail going to Kansas City 64108. Please put the signed page back in the packet.

Thanks,
Ruby', 'manual', null, now() - interval '919 minutes'),
  ('44444444-4444-4444-8444-444444444421'::uuid, 1, 'call', 'model', 'Outbound call with Ruby about the deposit timing before the build slot for the 12x24 Craftsman Cottage Porch in Kansas City. Agreed to send a revised drawing with that change marked.', 'manual', '66666666-6666-4666-8666-000000000028'::uuid, now() - interval '816 minutes'),
  ('44444444-4444-4444-8444-444444444421'::uuid, 2, 'telegram', 'user', 'Ruby via Telegram. Holding the build for a June delivery is the open item on the 12x24 Craftsman Cottage Porch for 64108. Please hold the build slot until the pad is inspected.', 'manual', null, now() - interval '713 minutes'),
  ('44444444-4444-4444-8444-444444444421'::uuid, 3, 'sms', 'model', 'Hi Ruby. On the invoice address for the co-buyer, I can price that option on the next revision for the 12x24 Craftsman Cottage Porch headed to Kansas City.', 'manual', null, now() - interval '610 minutes'),
  ('44444444-4444-4444-8444-444444444421'::uuid, 4, 'email', 'user', 'Hi TimberCraft,

This is Ruby. I am writing about a spare key for the side door for the 12x24 Craftsman Cottage Porch in dovetail going to Kansas City 64108. Please text the delivery window once the shop confirms it.

Thanks,
Ruby', 'manual', null, now() - interval '507 minutes'),
  ('44444444-4444-4444-8444-444444444421'::uuid, 5, 'facebook', 'model', 'Hi Ruby, saw your note on the warranty card after install. For the 12x24 Craftsman Cottage Porch in Kansas City I will email the itemized total with tax for this ZIP.', 'ai', null, now() - interval '404 minutes'),
  ('44444444-4444-4444-8444-444444444421'::uuid, 6, 'telegram', 'user', 'Ruby via Telegram. Confirming the site is free of overhead lines is the open item on the 12x24 Craftsman Cottage Porch for 64108. Please note it on the work order before the panels are cut.', 'manual', null, now() - interval '301 minutes'),
  ('44444444-4444-4444-8444-444444444421'::uuid, 7, 'sms', 'model', 'Hi Ruby. On whether the gravel pad needs to be six inches above grade, I can leave that line off the contract until we measure for the 12x24 Craftsman Cottage Porch headed to Kansas City.', 'manual', null, now() - interval '198 minutes'),
  ('44444444-4444-4444-8444-444444444421'::uuid, 8, 'email', 'user', 'Hi TimberCraft,

This is Ruby. I am writing about moving the loft ladder to the left wall for the 12x24 Craftsman Cottage Porch in dovetail going to Kansas City 64108. Please add it as a site note rather than a factory change.

Thanks,
Ruby', 'manual', null, now() - interval '95 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 0, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on a ridge vent instead of gable vents before we lock the 10x12 Metal Dutch Barn for Charleston. Can you schedule a five-minute call after lunch?', 'manual', null, now() - interval '577739 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 1, 'call', 'user', 'Caleb called in about keeping the double doors from swinging into the fence on the 10x12 Metal Dutch Barn headed to Charleston 29201. They want us to send the financing breakdown without the loft.', 'manual', '66666666-6666-4666-8666-000000000029'::uuid, now() - interval '577702 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 2, 'sms', 'user', 'Caleb here. Quick question on the electrical stub-out on the back wall for the 10x12 Metal Dutch Barn shipping to Charleston. Can you keep the current revision and only update the note?', 'manual', null, now() - interval '577665 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 3, 'email', 'model', 'Hi Caleb,

Following up on a wider ramp for the lawn tractor for your 10x12 Metal Dutch Barn in Charleston. I can check the HOA packet and reply with what is missing and send the updated ice cube white numbers today.

TimberCraft', 'manual', null, now() - interval '577628 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 4, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on staining the ramp boards before delivery before we lock the 10x12 Metal Dutch Barn for Charleston. Can you move the deposit request to Friday?', 'manual', null, now() - interval '577591 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 5, 'telegram', 'model', 'Caleb, Telegram update on the anchor kit for the wind rating: the 10x12 Metal Dutch Barn for 29201 can stay on track if I confirm the crew can stage from the alley.', 'ai', null, now() - interval '577554 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 6, 'sms', 'user', 'Caleb here. Quick question on adding a workbench along the right wall for the 10x12 Metal Dutch Barn shipping to Charleston. Can you quote the ramp as a separate line?', 'manual', null, now() - interval '577517 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 7, 'email', 'model', 'Hi Caleb,

Following up on the window placement above the potting bench for your 10x12 Metal Dutch Barn in Charleston. I can lock the color so the siding order can go out and send the updated ice cube white numbers today.

TimberCraft', 'manual', null, now() - interval '577480 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 8, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on a taller wall so the mower deck clears before we lock the 10x12 Metal Dutch Barn for Charleston. Can you send photos of the same building in that color?', 'manual', null, now() - interval '577443 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 9, 'telegram', 'model', 'Caleb, Telegram update on the moisture barrier under the floor: the 10x12 Metal Dutch Barn for 29201 can stay on track if I update the co-buyer on the shared deal.', 'manual', null, now() - interval '577406 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 10, 'sms', 'user', 'Caleb here. Quick question on replacing one window with a solid panel for the 10x12 Metal Dutch Barn shipping to Charleston. Can you put the signed page back in the packet?', 'manual', null, now() - interval '577369 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 11, 'email', 'model', 'Hi Caleb,

Following up on the permit drawing for the homeowners association for your 10x12 Metal Dutch Barn in Charleston. I can send a revised drawing with that change marked and send the updated ice cube white numbers today.

TimberCraft', 'ai', null, now() - interval '577332 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 12, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on a side entry so the garden path stays open before we lock the 10x12 Metal Dutch Barn for Charleston. Can you hold the build slot until the pad is inspected?', 'manual', null, now() - interval '577295 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 13, 'telegram', 'model', 'Caleb, Telegram update on the color match between the trim and the porch posts: the 10x12 Metal Dutch Barn for 29201 can stay on track if I price that option on the next revision.', 'manual', null, now() - interval '577258 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 14, 'sms', 'user', 'Caleb here. Quick question on shelving cleats at 16 inches on center for the 10x12 Metal Dutch Barn shipping to Charleston. Can you text the delivery window once the shop confirms it?', 'manual', null, now() - interval '577221 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 15, 'email', 'model', 'Hi Caleb,

Following up on a lockable loft hatch for your 10x12 Metal Dutch Barn in Charleston. I can email the itemized total with tax for this ZIP and send the updated ice cube white numbers today.

TimberCraft', 'manual', null, now() - interval '577184 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 16, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on the delivery truck clearance on the alley before we lock the 10x12 Metal Dutch Barn for Charleston. Can you note it on the work order before the panels are cut?', 'manual', null, now() - interval '577147 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 17, 'telegram', 'model', 'Caleb, Telegram update on pouring the piers before the crew arrives: the 10x12 Metal Dutch Barn for 29201 can stay on track if I ask the driver to walk the path the day before.', 'ai', null, now() - interval '577110 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 18, 'sms', 'user', 'Caleb here. Quick question on a metal threshold at the doorway for the 10x12 Metal Dutch Barn shipping to Charleston. Can you leave that line off the contract until we measure?', 'manual', null, now() - interval '577073 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 19, 'email', 'model', 'Hi Caleb,

Following up on the gutter downspout landing away from the pad for your 10x12 Metal Dutch Barn in Charleston. I can add it as a site note rather than a factory change and send the updated ice cube white numbers today.

TimberCraft', 'manual', null, now() - interval '577036 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 20, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on an extra tie-down at the back corners before we lock the 10x12 Metal Dutch Barn for Charleston. Can you schedule a five-minute call after lunch?', 'manual', null, now() - interval '576999 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 21, 'telegram', 'model', 'Caleb, Telegram update on the interior height under the loft: the 10x12 Metal Dutch Barn for 29201 can stay on track if I send the financing breakdown without the loft.', 'manual', null, now() - interval '576962 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 22, 'sms', 'user', 'Caleb here. Quick question on a Dutch door on the front only for the 10x12 Metal Dutch Barn shipping to Charleston. Can you keep the current revision and only update the note?', 'manual', null, now() - interval '576925 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 23, 'email', 'model', 'Hi Caleb,

Following up on the skylight option over the work area for your 10x12 Metal Dutch Barn in Charleston. I can check the HOA packet and reply with what is missing and send the updated ice cube white numbers today.

TimberCraft', 'ai', null, now() - interval '576888 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 24, 'call', 'model', 'Outbound call with Caleb about keeping the floor untreated for a later epoxy coat for the 10x12 Metal Dutch Barn in Charleston. Agreed to move the deposit request to Friday.', 'manual', '66666666-6666-4666-8666-000000000030'::uuid, now() - interval '576851 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 25, 'telegram', 'model', 'Caleb, Telegram update on the setback from the property line: the 10x12 Metal Dutch Barn for 29201 can stay on track if I confirm the crew can stage from the alley.', 'manual', null, now() - interval '576814 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 26, 'sms', 'user', 'Caleb here. Quick question on a flower-box shelf under the front window for the 10x12 Metal Dutch Barn shipping to Charleston. Can you quote the ramp as a separate line?', 'manual', null, now() - interval '576777 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 27, 'email', 'model', 'Hi Caleb,

Following up on the ramp slope for a wheelbarrow for your 10x12 Metal Dutch Barn in Charleston. I can lock the color so the siding order can go out and send the updated ice cube white numbers today.

TimberCraft', 'manual', null, now() - interval '576740 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 28, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on moving the vent so it misses the neighbor''s maple before we lock the 10x12 Metal Dutch Barn for Charleston. Can you send photos of the same building in that color?', 'manual', null, now() - interval '576703 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 29, 'telegram', 'model', 'Caleb, Telegram update on a partition wall for a small office nook: the 10x12 Metal Dutch Barn for 29201 can stay on track if I update the co-buyer on the shared deal.', 'ai', null, now() - interval '576666 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 30, 'sms', 'user', 'Caleb here. Quick question on the shutter color against the siding sample for the 10x12 Metal Dutch Barn shipping to Charleston. Can you put the signed page back in the packet?', 'manual', null, now() - interval '576629 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 31, 'email', 'model', 'Hi Caleb,

Following up on a concrete apron in front of the doors for your 10x12 Metal Dutch Barn in Charleston. I can send a revised drawing with that change marked and send the updated ice cube white numbers today.

TimberCraft', 'manual', null, now() - interval '576592 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 32, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on the deposit timing before the build slot before we lock the 10x12 Metal Dutch Barn for Charleston. Can you hold the build slot until the pad is inspected?', 'manual', null, now() - interval '576555 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 33, 'telegram', 'model', 'Caleb, Telegram update on holding the build for a June delivery: the 10x12 Metal Dutch Barn for 29201 can stay on track if I price that option on the next revision.', 'manual', null, now() - interval '576518 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 34, 'sms', 'user', 'Caleb here. Quick question on the invoice address for the co-buyer for the 10x12 Metal Dutch Barn shipping to Charleston. Can you text the delivery window once the shop confirms it?', 'manual', null, now() - interval '576481 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 35, 'email', 'model', 'Hi Caleb,

Following up on a spare key for the side door for your 10x12 Metal Dutch Barn in Charleston. I can email the itemized total with tax for this ZIP and send the updated ice cube white numbers today.

TimberCraft', 'ai', null, now() - interval '576444 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 36, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on the warranty card after install before we lock the 10x12 Metal Dutch Barn for Charleston. Can you note it on the work order before the panels are cut?', 'manual', null, now() - interval '576407 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 37, 'telegram', 'model', 'Caleb, Telegram update on confirming the site is free of overhead lines: the 10x12 Metal Dutch Barn for 29201 can stay on track if I ask the driver to walk the path the day before.', 'manual', null, now() - interval '576370 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 38, 'sms', 'user', 'Caleb here. Quick question on whether the gravel pad needs to be six inches above grade for the 10x12 Metal Dutch Barn shipping to Charleston. Can you add it as a site note rather than a factory change?', 'manual', null, now() - interval '576333 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 39, 'email', 'model', 'Hi Caleb,

Following up on moving the loft ladder to the left wall for your 10x12 Metal Dutch Barn in Charleston. I can schedule a five-minute call after lunch and send the updated ice cube white numbers today.

TimberCraft', 'manual', null, now() - interval '576296 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 40, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on a ridge vent instead of gable vents before we lock the 10x12 Metal Dutch Barn for Charleston. Can you send the financing breakdown without the loft?', 'manual', null, now() - interval '576259 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 41, 'telegram', 'model', 'Caleb, Telegram update on keeping the double doors from swinging into the fence: the 10x12 Metal Dutch Barn for 29201 can stay on track if I keep the current revision and only update the note.', 'ai', null, now() - interval '576222 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 42, 'sms', 'user', 'Caleb here. Quick question on the electrical stub-out on the back wall for the 10x12 Metal Dutch Barn shipping to Charleston. Can you check the HOA packet and reply with what is missing?', 'manual', null, now() - interval '576185 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 43, 'email', 'model', 'Hi Caleb,

Following up on a wider ramp for the lawn tractor for your 10x12 Metal Dutch Barn in Charleston. I can move the deposit request to Friday and send the updated ice cube white numbers today.

TimberCraft', 'manual', null, now() - interval '576148 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 44, 'facebook', 'user', 'Caleb on Facebook: I still need an answer on staining the ramp boards before delivery before we lock the 10x12 Metal Dutch Barn for Charleston. Can you confirm the crew can stage from the alley?', 'manual', null, now() - interval '576111 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 45, 'call', 'user', 'Caleb called in about the anchor kit for the wind rating on the 10x12 Metal Dutch Barn headed to Charleston 29201. They want us to quote the ramp as a separate line.', 'manual', '66666666-6666-4666-8666-000000000031'::uuid, now() - interval '576074 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 46, 'sms', 'user', 'Caleb here. Quick question on adding a workbench along the right wall for the 10x12 Metal Dutch Barn shipping to Charleston. Can you lock the color so the siding order can go out?', 'manual', null, now() - interval '576037 minutes'),
  ('44444444-4444-4444-8444-444444444422'::uuid, 47, 'email', 'model', 'Hi Caleb,

Following up on the window placement above the potting bench for your 10x12 Metal Dutch Barn in Charleston. I can send photos of the same building in that color and send the updated ice cube white numbers today.

TimberCraft', 'ai', null, now() - interval '576000 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 0, 'telegram', 'user', 'Freya via Telegram. A taller wall so the mower deck clears is the open item on the 14x32 Craftsman Wood Cottage for 32801. Please update the co-buyer on the shared deal.', 'manual', null, now() - interval '65904 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 1, 'call', 'model', 'Outbound call with Freya about the moisture barrier under the floor for the 14x32 Craftsman Wood Cottage in Orlando. Agreed to put the signed page back in the packet.', 'manual', '66666666-6666-4666-8666-000000000032'::uuid, now() - interval '65856 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 2, 'email', 'user', 'Hi TimberCraft,

This is Freya. I am writing about replacing one window with a solid panel for the 14x32 Craftsman Wood Cottage in rosemary going to Orlando 32801. Please send a revised drawing with that change marked.

Thanks,
Freya', 'manual', null, now() - interval '65808 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 3, 'facebook', 'model', 'Hi Freya, saw your note on the permit drawing for the homeowners association. For the 14x32 Craftsman Wood Cottage in Orlando I will hold the build slot until the pad is inspected.', 'manual', null, now() - interval '65760 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 4, 'telegram', 'user', 'Freya via Telegram. A side entry so the garden path stays open is the open item on the 14x32 Craftsman Wood Cottage for 32801. Please price that option on the next revision.', 'manual', null, now() - interval '65712 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 5, 'sms', 'model', 'Hi Freya. On the color match between the trim and the porch posts, I can text the delivery window once the shop confirms it for the 14x32 Craftsman Wood Cottage headed to Orlando.', 'ai', null, now() - interval '65664 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 6, 'email', 'user', 'Hi TimberCraft,

This is Freya. I am writing about shelving cleats at 16 inches on center for the 14x32 Craftsman Wood Cottage in rosemary going to Orlando 32801. Please email the itemized total with tax for this ZIP.

Thanks,
Freya', 'manual', null, now() - interval '65616 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 7, 'facebook', 'model', 'Hi Freya, saw your note on a lockable loft hatch. For the 14x32 Craftsman Wood Cottage in Orlando I will note it on the work order before the panels are cut.', 'manual', null, now() - interval '65568 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 8, 'telegram', 'user', 'Freya via Telegram. The delivery truck clearance on the alley is the open item on the 14x32 Craftsman Wood Cottage for 32801. Please ask the driver to walk the path the day before.', 'manual', null, now() - interval '65520 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 9, 'sms', 'model', 'Hi Freya. On pouring the piers before the crew arrives, I can leave that line off the contract until we measure for the 14x32 Craftsman Wood Cottage headed to Orlando.', 'manual', null, now() - interval '65472 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 10, 'email', 'user', 'Hi TimberCraft,

This is Freya. I am writing about a metal threshold at the doorway for the 14x32 Craftsman Wood Cottage in rosemary going to Orlando 32801. Please add it as a site note rather than a factory change.

Thanks,
Freya', 'manual', null, now() - interval '65424 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 11, 'facebook', 'model', 'Hi Freya, saw your note on the gutter downspout landing away from the pad. For the 14x32 Craftsman Wood Cottage in Orlando I will schedule a five-minute call after lunch.', 'ai', null, now() - interval '65376 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 12, 'telegram', 'user', 'Freya via Telegram. An extra tie-down at the back corners is the open item on the 14x32 Craftsman Wood Cottage for 32801. Please send the financing breakdown without the loft.', 'manual', null, now() - interval '65328 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 13, 'sms', 'model', 'Hi Freya. On the interior height under the loft, I can keep the current revision and only update the note for the 14x32 Craftsman Wood Cottage headed to Orlando.', 'manual', null, now() - interval '65280 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 14, 'email', 'user', 'Hi TimberCraft,

This is Freya. I am writing about a Dutch door on the front only for the 14x32 Craftsman Wood Cottage in rosemary going to Orlando 32801. Please check the HOA packet and reply with what is missing.

Thanks,
Freya', 'manual', null, now() - interval '65232 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 15, 'facebook', 'model', 'Hi Freya, saw your note on the skylight option over the work area. For the 14x32 Craftsman Wood Cottage in Orlando I will move the deposit request to Friday.', 'manual', null, now() - interval '65184 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 16, 'telegram', 'user', 'Freya via Telegram. Keeping the floor untreated for a later epoxy coat is the open item on the 14x32 Craftsman Wood Cottage for 32801. Please confirm the crew can stage from the alley.', 'manual', null, now() - interval '65136 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 17, 'sms', 'model', 'Hi Freya. On the setback from the property line, I can quote the ramp as a separate line for the 14x32 Craftsman Wood Cottage headed to Orlando.', 'ai', null, now() - interval '65088 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 18, 'email', 'user', 'Hi TimberCraft,

This is Freya. I am writing about a flower-box shelf under the front window for the 14x32 Craftsman Wood Cottage in rosemary going to Orlando 32801. Please lock the color so the siding order can go out.

Thanks,
Freya', 'manual', null, now() - interval '65040 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 19, 'facebook', 'model', 'Hi Freya, saw your note on the ramp slope for a wheelbarrow. For the 14x32 Craftsman Wood Cottage in Orlando I will send photos of the same building in that color.', 'manual', null, now() - interval '64992 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 20, 'telegram', 'user', 'Freya via Telegram. Moving the vent so it misses the neighbor''s maple is the open item on the 14x32 Craftsman Wood Cottage for 32801. Please update the co-buyer on the shared deal.', 'manual', null, now() - interval '64944 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 21, 'call', 'model', 'Outbound call with Freya about a partition wall for a small office nook for the 14x32 Craftsman Wood Cottage in Orlando. Agreed to put the signed page back in the packet.', 'manual', '66666666-6666-4666-8666-000000000033'::uuid, now() - interval '64896 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 22, 'email', 'user', 'Hi TimberCraft,

This is Freya. I am writing about the shutter color against the siding sample for the 14x32 Craftsman Wood Cottage in rosemary going to Orlando 32801. Please send a revised drawing with that change marked.

Thanks,
Freya', 'manual', null, now() - interval '64848 minutes'),
  ('44444444-4444-4444-8444-444444444423'::uuid, 23, 'facebook', 'model', 'Hi Freya, saw your note on a concrete apron in front of the doors. For the 14x32 Craftsman Wood Cottage in Orlando I will hold the build slot until the pad is inspected.', 'ai', null, now() - interval '64800 minutes')
on conflict (conversation_id, position) do nothing;

insert into crm.quote_revisions (quote_id, revision_number, status, selections, created_at, updated_at)
select
  quote.id,
  1,
  case
    when exists (
      select 1
      from crm.deals as deal
      where deal.quote_id = quote.id
        and deal.status in ('quote_sent', 'quote_viewed', 'partially_signed', 'deal_won')
    ) then 'sent'
    else 'draft'
  end,
  quote.selections,
  quote.created_at,
  quote.updated_at
from crm.quotes as quote
where quote.id in (
  '11111111-1111-4111-8111-111111111201',
  '11111111-1111-4111-8111-111111111202',
  '11111111-1111-4111-8111-111111111203',
  '11111111-1111-4111-8111-111111111204',
  '11111111-1111-4111-8111-111111111205',
  '11111111-1111-4111-8111-111111111206',
  '11111111-1111-4111-8111-111111111207',
  '11111111-1111-4111-8111-111111111208',
  '11111111-1111-4111-8111-111111111209',
  '11111111-1111-4111-8111-111111111210',
  '11111111-1111-4111-8111-111111111211',
  '11111111-1111-4111-8111-111111111212'
)
  and not exists (
    select 1
    from crm.quote_revisions as revision
    where revision.quote_id = quote.id
  );

update crm.quotes as quote
set active_revision_id = revision.id
from crm.quote_revisions as revision
where revision.quote_id = quote.id
  and revision.revision_number = 1
  and quote.active_revision_id is null
  and quote.id in (
    '11111111-1111-4111-8111-111111111201',
    '11111111-1111-4111-8111-111111111202',
    '11111111-1111-4111-8111-111111111203',
    '11111111-1111-4111-8111-111111111204',
    '11111111-1111-4111-8111-111111111205',
    '11111111-1111-4111-8111-111111111206',
    '11111111-1111-4111-8111-111111111207',
    '11111111-1111-4111-8111-111111111208',
    '11111111-1111-4111-8111-111111111209',
    '11111111-1111-4111-8111-111111111210',
    '11111111-1111-4111-8111-111111111211',
    '11111111-1111-4111-8111-111111111212'
  );

update crm.customers as customer
set active_deal_id = seed.deal_id
from (
  values
  ('33333333-3333-4333-8333-333333333309'::uuid, '22222222-2222-4222-8222-222222222301'::uuid),
  ('33333333-3333-4333-8333-333333333310'::uuid, '22222222-2222-4222-8222-222222222301'::uuid),
  ('33333333-3333-4333-8333-333333333311'::uuid, '22222222-2222-4222-8222-222222222301'::uuid),
  ('33333333-3333-4333-8333-333333333312'::uuid, '22222222-2222-4222-8222-222222222303'::uuid),
  ('33333333-3333-4333-8333-333333333313'::uuid, '22222222-2222-4222-8222-222222222303'::uuid),
  ('33333333-3333-4333-8333-333333333314'::uuid, '22222222-2222-4222-8222-222222222304'::uuid),
  ('33333333-3333-4333-8333-333333333315'::uuid, '22222222-2222-4222-8222-222222222304'::uuid),
  ('33333333-3333-4333-8333-333333333316'::uuid, '22222222-2222-4222-8222-222222222305'::uuid),
  ('33333333-3333-4333-8333-333333333317'::uuid, '22222222-2222-4222-8222-222222222306'::uuid),
  ('33333333-3333-4333-8333-333333333318'::uuid, '22222222-2222-4222-8222-222222222307'::uuid),
  ('33333333-3333-4333-8333-333333333319'::uuid, '22222222-2222-4222-8222-222222222308'::uuid),
  ('33333333-3333-4333-8333-333333333320'::uuid, '22222222-2222-4222-8222-222222222309'::uuid),
  ('33333333-3333-4333-8333-333333333321'::uuid, '22222222-2222-4222-8222-222222222310'::uuid),
  ('33333333-3333-4333-8333-333333333322'::uuid, '22222222-2222-4222-8222-222222222311'::uuid),
  ('33333333-3333-4333-8333-333333333323'::uuid, '22222222-2222-4222-8222-222222222312'::uuid)
) as seed (customer_id, deal_id)
where customer.id = seed.customer_id
  and customer.active_deal_id is null;
