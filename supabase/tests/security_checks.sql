-- =====================================================================
--  Security & behaviour checks for the database.
--
--  Run against your LOCAL Supabase after `supabase db reset` (which loads
--  the Sunil Perera sample data):
--
--    psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/security_checks.sql
--
--  Everything runs inside one transaction that is rolled back at the end,
--  so it leaves no trace. Each check prints "PASS ..." or stops with
--  "FAIL ...". The last line should be "ALL CHECKS PASSED".
-- =====================================================================

begin;

-- Fixed ids: user A (Kasun) from seed.sql, user B (a stranger) made here
insert into auth.users (id, aud, role, phone) values
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', '94770000002');
insert into auth.users (id, aud, role, phone) values
  ('00000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', '94770000003');

do $$ begin
  if not exists (select 1 from public.app_users where id = '00000000-0000-4000-8000-0000000000b2')
  then raise exception 'FAIL 01 app_users row not auto-created'; end if;
  raise notice 'PASS 01 new login gets an app_users row automatically';
end $$;

-- ---------------------------------------------------------------- user A
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';

do $$ begin
  if (select count(*) from public.people) <> 1 then raise exception 'FAIL 02'; end if;
  if (select count(*) from public.medications) <> 5 then raise exception 'FAIL 03'; end if;
  if public.preview_scan_profile('00000000-0000-4000-8000-0000000000a1') ->> 'name' <> 'Sunil Perera' then raise exception 'FAIL 04'; end if;
  raise notice 'PASS 02-04 manager sees the profile, its medicines, and the scan preview';

  perform public.create_person('Kasun Perera', 'self');
  if (select count(*) from public.people) <> 2 then raise exception 'FAIL 05'; end if;
  raise notice 'PASS 05 create_person makes a profile and its owner';

  begin perform public.create_person('Kasun again', 'self'); raise exception 'FAIL 06';
  exception when unique_violation then raise notice 'PASS 06 only one "this is me" profile per user'; end;

  begin insert into public.people (full_name) values ('x'); raise exception 'FAIL 07';
  exception when insufficient_privilege then raise notice 'PASS 07 direct insert into people is blocked'; end;

  begin update public.people set created_by = '00000000-0000-4000-8000-0000000000b2'; raise exception 'FAIL 08';
  exception when insufficient_privilege then raise notice 'PASS 08 created_by cannot be changed'; end;

  begin insert into public.emergency_contacts (person_id, name, relationship, phone_e164, priority)
        values ('00000000-0000-4000-8000-0000000000a1', 'X', 'friend', '+94771234567', 4); raise exception 'FAIL 09';
  exception when check_violation then raise notice 'PASS 09 a 4th emergency contact is refused'; end;

  begin insert into public.emergency_contacts (person_id, name, relationship, phone_e164, priority)
        values ('00000000-0000-4000-8000-0000000000a1', 'X', 'friend', '0771234567', 3); raise exception 'FAIL 10';
  exception when check_violation then raise notice 'PASS 10 phone numbers must be in +94... format'; end;

  begin perform public.get_scan_profile('devonly_SunilPerera_0001'); raise exception 'FAIL 11';
  exception when insufficient_privilege then raise notice 'PASS 11 logged-in users cannot call the scan function'; end;

  if (public.issue_qr_token('00000000-0000-4000-8000-0000000000a1', 'Helmet sticker')).token !~ '^[A-Za-z0-9_-]{24}$'
  then raise exception 'FAIL 12'; end if;
  raise notice 'PASS 12 new QR token is 24 random URL-safe characters';
end $$;

-- offline QR text
do $$
declare v text;
begin
  v := public.offline_qr_text((select id from public.qr_tokens where token = 'devonly_SunilPerera_0001'), 'https://example.lk');
  raise notice E'--- offline QR text (% bytes):\n%', octet_length(v), v;
  if octet_length(split_part(v, E'\nMore: ', 1)) > 300 then raise exception 'FAIL 13 offline text over 300 bytes'; end if;
  if v !~ 'BLOOD THINNER' or v !~ 'Penicillin' or v !~ 'Ambulance: 1990'
     or v !~ 'https://example.lk/s/devonly_SunilPerera_0001$' then raise exception 'FAIL 13 content'; end if;
  if v ~* 'metformin|losartan' then raise exception 'FAIL 13 private medicines leaked'; end if;
  raise notice 'PASS 13 offline QR text fits 300 bytes, has the essentials, no private medicines';

  begin perform public.offline_qr_text((select id from public.qr_tokens limit 1), 'http://evil.com'); raise exception 'FAIL 14';
  exception when invalid_parameter_value then raise notice 'PASS 14 offline QR link must be https'; end;
end $$;

-- invites: A invites C
create temporary table test_invite as
  select public.create_person_invite('00000000-0000-4000-8000-0000000000a1', 'For Nadeesha') as invite_code;

do $$ begin
  begin perform code_hash from public.person_invites; raise exception 'FAIL 15';
  exception when insufficient_privilege then raise notice 'PASS 15 invite code hashes are not readable'; end;
end $$;

-- ---------------------------------------------------------------- user B (stranger)
set request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000b2';
do $$ begin
  if (select count(*) from public.people) + (select count(*) from public.medications)
   + (select count(*) from public.emergency_contacts) + (select count(*) from public.qr_tokens)
   + (select count(*) from public.scan_events) + (select count(*) from public.person_managers)
   + (select count(*) from public.person_invites) <> 0 then raise exception 'FAIL 16'; end if;
  if (select count(*) from public.app_users) <> 1 then raise exception 'FAIL 16b sees other users'; end if;
  raise notice 'PASS 16 a stranger sees none of the family''s data or accounts';

  begin perform public.preview_scan_profile('00000000-0000-4000-8000-0000000000a1'); raise exception 'FAIL 17';
  exception when insufficient_privilege then raise notice 'PASS 17 stranger cannot preview'; end;

  begin insert into public.allergies (person_id, substance) values ('00000000-0000-4000-8000-0000000000a1', 'Nuts'); raise exception 'FAIL 18';
  exception when insufficient_privilege then raise notice 'PASS 18 stranger cannot add data'; end;

  update public.medications set dose = '50 mg' where name = 'Warfarin';
  delete from public.people;

  begin perform public.issue_qr_token('00000000-0000-4000-8000-0000000000a1'); raise exception 'FAIL 19';
  exception when insufficient_privilege then raise notice 'PASS 19 stranger cannot make QR codes'; end;

  begin perform public.export_person_data('00000000-0000-4000-8000-0000000000a1'); raise exception 'FAIL 20';
  exception when insufficient_privilege then raise notice 'PASS 20 stranger cannot export'; end;

  begin perform public.create_person_invite('00000000-0000-4000-8000-0000000000a1'); raise exception 'FAIL 21';
  exception when insufficient_privilege then raise notice 'PASS 21 stranger cannot invite'; end;

  begin perform public.accept_person_invite('AAAAAAAAAAAAAAAAAAAAAAAA'); raise exception 'FAIL 22';
  exception when no_data_found then raise notice 'PASS 22 a made-up invite code is refused'; end;
end $$;

-- ---------------------------------------------------------------- user C accepts the invite
set request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c3';
select set_config('test.invite_code', invite_code, false) from test_invite;
do $$ begin
  perform public.accept_person_invite(current_setting('test.invite_code'), 'parent');
  if (select count(*) from public.people) <> 1 then raise exception 'FAIL 23'; end if;
  if (select count(*) from public.app_users) <> 2 then raise exception 'FAIL 24 co-manager names'; end if;
  raise notice 'PASS 23-24 invited relative now manages Sunil and sees co-manager names';

  begin perform public.accept_person_invite(current_setting('test.invite_code')); raise exception 'FAIL 25';
  exception when sqlstate 'P0002' then raise notice 'PASS 25 an invite link works only once'; end;

  begin perform public.create_person_invite('00000000-0000-4000-8000-0000000000a1'); raise exception 'FAIL 26';
  exception when insufficient_privilege then raise notice 'PASS 26 editors cannot invite (only the owner)'; end;

  delete from public.people where id = '00000000-0000-4000-8000-0000000000a1';
  if (select count(*) from public.people) <> 1 then raise exception 'FAIL 27'; end if;
  raise notice 'PASS 27 editors cannot delete the profile';
end $$;

-- ---------------------------------------------------------------- anonymous visitor
reset request.jwt.claim.sub;
set role anon;
do $$ begin
  begin perform 1 from public.people; raise exception 'FAIL 28';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.qr_tokens; raise exception 'FAIL 28';
  exception when insufficient_privilege then null; end;
  begin perform public.get_scan_profile('devonly_SunilPerera_0001'); raise exception 'FAIL 28';
  exception when insufficient_privilege then null; end;
  begin perform public.create_person('x'); raise exception 'FAIL 28';
  exception when insufficient_privilege then null; end;
  begin perform public.scan_notification_payload(1, 'scan'); raise exception 'FAIL 28';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS 28 anonymous visitors can read nothing and call nothing';
end $$;

-- ---------------------------------------------------------------- the server (secret key)
set role service_role;
do $$
declare r jsonb; v_scan bigint; i int; n int := 0; p jsonb;
begin
  if (select dose from public.medications where name = 'Warfarin') <> '5 mg'
     or (select count(*) from public.people where id = '00000000-0000-4000-8000-0000000000a1') <> 1
  then raise exception 'FAIL 29 stranger changed data'; end if;
  raise notice 'PASS 29 the stranger''s update and delete changed nothing';

  r := public.get_scan_profile('devonly_SunilPerera_0001', 'iphash1', 'LK');
  raise notice E'--- what a stranger sees when scanning:\n%', jsonb_pretty(r);
  if r ->> 'status' <> 'ok' or r -> 'profile' -> 'medications' <> '[]'::jsonb
     or (r -> 'profile') ? 'insurer' or r::text ~* 'policy|metformin'
  then raise exception 'FAIL 30'; end if;
  raise notice 'PASS 30 scan shows only public fields (medicines private by default)';

  if public.get_scan_profile('nope') ->> 'status' <> 'not_found'
     or public.get_scan_profile('aaaaaaaaaaaaaaaaaaaaaaaa') ->> 'status' <> 'not_found'
  then raise exception 'FAIL 31'; end if;
  raise notice 'PASS 31 bad or unknown tokens -> not_found';

  v_scan := (r ->> 'scan_id')::bigint;
  if public.add_scan_location(v_scan, 'wrongwrongwrongwrongwron', 6.9, 79.9) then raise exception 'FAIL 32a'; end if;
  if not public.add_scan_location(v_scan, 'devonly_SunilPerera_0001', 6.912345, 79.861234, 20) then raise exception 'FAIL 32b'; end if;
  if public.add_scan_location(v_scan, 'devonly_SunilPerera_0001', 1, 1) then raise exception 'FAIL 32c'; end if;
  if (select approx_lat from public.scan_events where id = v_scan) <> 6.912 then raise exception 'FAIL 32d'; end if;
  raise notice 'PASS 32 location: matching token only, once, rounded to ~100 m';

  -- switching language reuses the scan instead of logging (and alerting) a new one
  n := (select count(*) from public.scan_events);
  if (public.get_scan_profile('devonly_SunilPerera_0001', null, null, v_scan) ->> 'scan_id')::bigint <> v_scan
     or (select count(*) from public.scan_events) <> n then raise exception 'FAIL 32e'; end if;
  update public.scan_events set scanned_at = now() - interval '31 minutes' where id = v_scan;
  if (public.get_scan_profile('devonly_SunilPerera_0001', null, null, v_scan) ->> 'scan_id')::bigint = v_scan
  then raise exception 'FAIL 32f old scan reused'; end if;
  update public.scan_events set scanned_at = now() where id = v_scan;
  n := 0;
  raise notice 'PASS 32b language switch reuses a recent scan (max 30 min), else logs a new one';

  for i in 1..35 loop
    if public.get_scan_profile('devonly_SunilPerera_0001', 'flood') ->> 'status' = 'rate_limited' then n := n + 1; end if;
  end loop;
  if n <> 5 then raise exception 'FAIL 33 rate limited % of 35', n; end if;
  raise notice 'PASS 33 more than 30 scans a minute from one visitor are refused';

  -- family alert decisions
  p := public.scan_notification_payload(v_scan, 'scan');
  if (p ->> 'send')::boolean then raise exception 'FAIL 34a should not send without contact emails'; end if;
  update public.emergency_contacts set email = 'kasun@example.com' where name = 'Kasun';
  p := public.scan_notification_payload(v_scan, 'scan');
  if not (p ->> 'send')::boolean or jsonb_array_length(p -> 'recipients') <> 1 or p::text ~* 'warfarin|penicillin'
  then raise exception 'FAIL 34b %', p; end if;
  perform public.mark_scan_notified(v_scan, 'scan');
  p := public.scan_notification_payload(v_scan + 1, 'scan');
  if (p ->> 'send')::boolean or p ->> 'reason' <> 'throttled' then raise exception 'FAIL 34c %', p; end if;
  p := public.scan_notification_payload(v_scan, 'location');
  if not (p ->> 'send')::boolean or (p ->> 'lat')::numeric <> 6.912 then raise exception 'FAIL 34d %', p; end if;
  raise notice 'PASS 34 alerts: need an email, no health data, max 1 per 10 min, location sent separately';
end $$;

reset role;
update public.conditions set show_on_scan = false where name = 'Atrial fibrillation';
update public.people set home_area = 'Nugegoda' where id = '00000000-0000-4000-8000-0000000000a1';
set role service_role;
do $$ begin
  if public.get_scan_profile('devonly_SunilPerera_0001') ->> 'profile' ~ 'Atrial' then raise exception 'FAIL 35'; end if;
  if (public.get_scan_profile('devonly_SunilPerera_0001') -> 'profile') ? 'home_area' then raise exception 'FAIL 36'; end if;
  update public.people set lost_person_mode = true where id = '00000000-0000-4000-8000-0000000000a1';
  if public.get_scan_profile('devonly_SunilPerera_0001') -> 'profile' ->> 'home_area' <> 'Nugegoda' then raise exception 'FAIL 37'; end if;
  raise notice 'PASS 35-37 hidden items stay hidden; home area only in lost-person mode';
end $$;

-- ---------------------------------------------------------------- owner A: revoke, export, delete
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
do $$ declare e jsonb; begin
  perform public.revoke_qr_token((select id from public.qr_tokens where token = 'devonly_SunilPerera_0001'));
  e := public.export_person_data('00000000-0000-4000-8000-0000000000a1');
  if jsonb_array_length(e -> 'medications') <> 5 or jsonb_array_length(e -> 'scans') < 1 then raise exception 'FAIL 38'; end if;
  raise notice 'PASS 38 owner can export everything (incl. private medicines and scan history)';
end $$;
set role service_role;
do $$ begin
  if public.get_scan_profile('devonly_SunilPerera_0001') ->> 'status' <> 'deactivated' then raise exception 'FAIL 39'; end if;
  raise notice 'PASS 39 a revoked (lost) card shows "deactivated"';
end $$;

-- account deletion: A owns Sunil (co-managed by C) and Kasun (alone)
do $$ declare s jsonb; begin
  s := public.prepare_account_deletion('00000000-0000-4000-8000-000000000001');
  if (s ->> 'profiles_handed_over')::int <> 1 or (s ->> 'profiles_deleted')::int <> 1 then raise exception 'FAIL 40 %', s; end if;
  if (select role from public.person_managers where person_id = '00000000-0000-4000-8000-0000000000a1'
        and user_id = '00000000-0000-4000-8000-0000000000c3') <> 'owner' then raise exception 'FAIL 40b'; end if;
  raise notice 'PASS 40 deleting an account hands shared profiles to the co-manager, deletes the rest';
end $$;

-- owner C deletes Sunil -> all rows gone, photo purge queued
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c3';
delete from public.people where id = '00000000-0000-4000-8000-0000000000a1';
reset role;
do $$ begin
  if exists (select 1 from public.medications where person_id = '00000000-0000-4000-8000-0000000000a1')
     or exists (select 1 from public.scan_events where person_id = '00000000-0000-4000-8000-0000000000a1')
     or exists (select 1 from public.qr_tokens where person_id = '00000000-0000-4000-8000-0000000000a1')
  then raise exception 'FAIL 41'; end if;
  if not exists (select 1 from private.file_purge_queue where person_id = '00000000-0000-4000-8000-0000000000a1')
  then raise exception 'FAIL 42'; end if;
  raise notice 'PASS 41-42 deleting a person erases all rows and queues photo removal';
end $$;

do $$ begin raise notice 'ALL CHECKS PASSED'; end $$;
rollback;
