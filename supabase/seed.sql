-- =====================================================================
--  DEVELOPMENT SAMPLE DATA ONLY — never run against a production project.
--  Runs as the database owner (bypasses RLS), so it can set things up
--  directly. Everything here is fictional.
-- =====================================================================

-- A test login (matches a Supabase "test OTP" phone number you configure
-- in Authentication -> Phone -> Test phone numbers, e.g. 94770000001=123456)
--
-- This file does NOT create the auth user itself. Hand-inserting rows into
-- auth.users/auth.identities looks like it should work, but Supabase's real
-- Auth server (GoTrue) does not reliably recognise a hand-inserted row as
-- an existing user: calling POST /auth/v1/otp for this phone can make
-- GoTrue try to INSERT a "new" user anyway, which then fails with
-- "duplicate key value violates unique constraint users_phone_key" -- a
-- real error hit testing this against a live project, not a local-only
-- quirk, and not fixed by matching column formats more closely.
--
-- Instead: let GoTrue create the user the normal way, then have this
-- script look up whatever id it was given. One-time setup, before running
-- this seed:
--   curl -X POST "$API/auth/v1/otp" -H "apikey: $ANON" \
--     -H "Content-Type: application/json" -d '{"phone":"94770000001"}'
-- (configure 94770000001 -> a fixed code such as 123456 under
-- Authentication -> Phone -> Test phone numbers first). This only needs to
-- be done once per database -- GoTrue keeps the row after that, and
-- re-running this seed script will keep finding the same user.
do $$
declare
  test_user_id uuid;
begin
  select id into test_user_id from auth.users where phone = '94770000001';

  if test_user_id is null then
    raise exception
      'No auth user with phone 94770000001 found. Call POST /auth/v1/otp '
      'with {"phone":"94770000001"} first (e.g. via curl, or sign in once '
      'from the app) to let GoTrue create it, then re-run this seed.';
  end if;

  insert into public.app_users (id, display_name, preferred_language)
  values (test_user_id, 'Kasun (test)', 'en')
  on conflict (id) do update set display_name = excluded.display_name;

  -- Sunil Perera, 72
  insert into public.people (
    id, created_by, full_name, display_name, date_of_birth, spoken_languages, blood_group,
    organ_donor, communication_needs, show_organ_donor, info_confirmed_at)
  values (
    '00000000-0000-4000-8000-0000000000a1', test_user_id,
    'Sunil Perera', 'Sunil Perera', '1954-03-15', '{si}', 'O+',
    true, 'Hard of hearing in left ear. Speak on his right side.', true, now() - interval '12 days')
  on conflict (id) do update set created_by = excluded.created_by;

  insert into public.person_managers (person_id, user_id, role, person_is_my)
  values ('00000000-0000-4000-8000-0000000000a1', test_user_id, 'owner', 'parent')
  on conflict (person_id, user_id) do nothing;

  insert into public.qr_tokens (person_id, token, label, created_by)
  values ('00000000-0000-4000-8000-0000000000a1', 'devonly_SunilPerera_0001', 'Dev test card', test_user_id)
  on conflict (token) do nothing;
end $$;

insert into public.critical_alerts (person_id, code, note) values
  ('00000000-0000-4000-8000-0000000000a1', 'blood_thinner',    'Warfarin'),
  ('00000000-0000-4000-8000-0000000000a1', 'diabetes_insulin', 'Insulin glargine at night'),
  ('00000000-0000-4000-8000-0000000000a1', 'severe_allergy',   'Penicillin');

insert into public.allergies (person_id, substance, severity) values
  ('00000000-0000-4000-8000-0000000000a1', 'Penicillin', 'severe');

insert into public.conditions (person_id, name, since_year) values
  ('00000000-0000-4000-8000-0000000000a1', 'Type 2 diabetes',     2012),
  ('00000000-0000-4000-8000-0000000000a1', 'Atrial fibrillation', 2019),
  ('00000000-0000-4000-8000-0000000000a1', 'High blood pressure', null);

insert into public.medications (person_id, name, dose, frequency, kind) values
  ('00000000-0000-4000-8000-0000000000a1', 'Warfarin',            '5 mg',   'Once daily',  'prescription'),
  ('00000000-0000-4000-8000-0000000000a1', 'Insulin glargine',    null,     'At night',    'prescription'),
  ('00000000-0000-4000-8000-0000000000a1', 'Metformin',           '500 mg', 'Twice daily', 'prescription'),
  ('00000000-0000-4000-8000-0000000000a1', 'Losartan',            '50 mg',  'Once daily',  'prescription'),
  ('00000000-0000-4000-8000-0000000000a1', 'Kothala himbutu tea', null,     null,          'herbal_ayurvedic');

insert into public.emergency_contacts (person_id, name, relationship, phone_e164, priority) values
  ('00000000-0000-4000-8000-0000000000a1', 'Kasun',    'son',      '+971500000000', 1),
  ('00000000-0000-4000-8000-0000000000a1', 'Nadeesha', 'daughter', '+94770000000',  2);

-- (The 'devonly_SunilPerera_0001' QR token -- the fixed, obviously-fake
-- token so the scan page has a stable test URL at /s/devonly_SunilPerera_0001
-- -- is inserted above, inside the do $$ block, since it needs test_user_id.)