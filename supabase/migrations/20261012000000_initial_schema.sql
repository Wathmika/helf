-- =====================================================================
--  [Product Name] — initial database schema (prototype, milestone 1)
--  Target: Supabase (PostgreSQL 15+)
-- =====================================================================
--
--  THE BIG PICTURE (read this first)
--  ---------------------------------
--  * A PERSON is someone who has an emergency profile (e.g. Sunil, 72).
--  * A USER is someone who logs in with their phone (Sunil himself, or his
--    son Kasun in Dubai). One user can look after many people, and one
--    person can be looked after by several users (Kasun AND Nadeesha).
--  * person_managers is the link between the two. Every security rule in
--    this file comes down to one question: "is the logged-in user a
--    manager of this person?" (private.is_manager).
--  * Every health table hangs off person_id. Later features (lab reports,
--    prescriptions, medicine reminders) are just more tables with a
--    person_id and the same rule, so nothing here needs redesigning.
--  * The public scan page NEVER reads tables. A server-side function on the
--    Python backend calls get_scan_profile(token), which returns only the
--    fields the owner marked "show when scanned". Anonymous visitors can't
--    call even that function directly; only the server key can.
--
--  FUTURE FHIR MAPPING (for the national health record, later)
--  ------------------------------------------------------------
--    people              -> Patient
--    emergency_contacts  -> RelatedPerson
--    allergies           -> AllergyIntolerance
--    conditions          -> Condition
--    medications         -> MedicationStatement
--    critical_alerts     -> Flag
--  The nullable code_system / code columns are there so a later version can
--  attach SNOMED CT / RxNorm codes without a schema change.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- "private" holds helper functions and internal tables. Supabase's API only
-- exposes the schemas you list (public by default), so nothing in here is
-- reachable from the browser.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;


-- =====================================================================
--  1. TYPES  (fixed lists, so the scan page can translate each value)
-- =====================================================================

-- "Who is this profile for?" from the logged-in user's point of view
create type public.profile_for as enum ('self', 'parent', 'child', 'spouse', 'other');

-- How an emergency contact relates to the PERSON (translated on scan page;
-- gendered on purpose because Sinhala and Tamil words differ: putha / duwa)
create type public.contact_relationship as enum (
  'son', 'daughter', 'husband', 'wife', 'father', 'mother',
  'brother', 'sister', 'grandson', 'granddaughter',
  'relative', 'friend', 'neighbour', 'caregiver', 'other'
);

create type public.alert_code as enum (
  'blood_thinner', 'diabetes_insulin', 'epilepsy', 'heart_condition',
  'pacemaker_implant', 'severe_allergy', 'pregnancy', 'dementia',
  'hearing_impairment', 'vision_impairment'
);

create type public.allergy_severity as enum ('mild', 'moderate', 'severe', 'life_threatening', 'unknown');
create type public.medication_kind  as enum ('prescription', 'over_the_counter', 'herbal_ayurvedic');
create type public.manager_role     as enum ('owner', 'editor');
create type public.token_status     as enum ('active', 'revoked');


-- =====================================================================
--  2. TABLES
-- =====================================================================

-- One row per login. Created automatically when someone signs up.
create table public.app_users (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text check (char_length(display_name) <= 60),
  preferred_language text not null default 'si' check (preferred_language in ('si', 'ta', 'en')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- One row per person with an emergency profile.
create table public.people (
  id                       uuid primary key default gen_random_uuid(),
  created_by               uuid references auth.users (id) on delete set null,

  -- basics
  full_name                text not null check (char_length(full_name) between 1 and 120),
  display_name             text check (char_length(display_name) <= 60),   -- big name on the scan page, e.g. "Sunil Perera"
  date_of_birth            date check (date_of_birth > date '1900-01-01'),
  photo_path               text,                                           -- path inside the private "person-photos" bucket
  spoken_languages         text[] not null default '{}' check (cardinality(spoken_languages) <= 6),
  blood_group              text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  organ_donor              boolean,
  communication_needs      text check (char_length(communication_needs) <= 300),  -- "Hard of hearing in left ear"

  -- dementia "lost person" mode: a general area only (e.g. "Nugegoda"),
  -- never a street address. Only shown while lost_person_mode is on.
  home_area                text check (char_length(home_area) <= 80),
  lost_person_mode         boolean not null default false,

  -- optional
  insurer_name             text check (char_length(insurer_name) <= 80),
  insurance_policy_number  text check (char_length(insurance_policy_number) <= 60),  -- never shown on scan page
  preferred_hospital       text check (char_length(preferred_hospital) <= 120),

  -- "show when scanned" toggles for single fields
  -- (list items such as allergies have their own toggle per row)
  show_photo               boolean not null default true,
  show_age                 boolean not null default true,
  show_blood_group         boolean not null default true,
  show_languages           boolean not null default true,
  show_communication_needs boolean not null default true,
  show_organ_donor         boolean not null default false,
  show_preferred_hospital  boolean not null default false,
  show_insurance           boolean not null default false,  -- shows insurer NAME only, never the policy number

  -- freshness: "Updated 12 days ago"
  info_confirmed_at        timestamptz,                       -- user tapped "still accurate" (3-monthly prompt)
  content_updated_at       timestamptz not null default now(),-- bumped automatically on any edit

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Who can see and edit which person.
create table public.person_managers (
  person_id    uuid not null references public.people (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         public.manager_role not null default 'editor',
  person_is_my public.profile_for not null default 'other',   -- "this is my parent"
  created_at   timestamptz not null default now(),
  primary key (person_id, user_id)
);
create index person_managers_user_idx on public.person_managers (user_id);
-- a user can have only one "this is me" profile
create unique index person_managers_one_self_idx on public.person_managers (user_id) where person_is_my = 'self';

create table public.critical_alerts (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.people (id) on delete cascade,
  code         public.alert_code not null,
  note         text check (char_length(note) <= 120),          -- e.g. "Warfarin"
  show_on_scan boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (person_id, code)
);

create table public.allergies (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.people (id) on delete cascade,
  substance    text not null check (char_length(substance) between 1 and 80),   -- "Penicillin"
  reaction     text check (char_length(reaction) <= 120),                       -- "Swelling, breathing difficulty"
  severity     public.allergy_severity not null default 'unknown',
  code_system  text,
  code         text,
  show_on_scan boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index allergies_person_idx on public.allergies (person_id);

create table public.conditions (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.people (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  since_year   smallint check (since_year between 1900 and 2100),
  notes        text check (char_length(notes) <= 200),
  code_system  text,
  code         text,
  show_on_scan boolean not null default true,   -- can be hidden one by one (e.g. a sensitive diagnosis)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index conditions_person_idx on public.conditions (person_id);

create table public.medications (
  id                uuid primary key default gen_random_uuid(),
  person_id         uuid not null references public.people (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 120),   -- "Warfarin" / "Kothala himbutu tea"
  dose              text check (char_length(dose) <= 60),                         -- "5 mg"
  frequency         text check (char_length(frequency) <= 60),                    -- "once daily"
  kind              public.medication_kind not null default 'prescription',
  packet_photo_path text,                                                         -- never shown on scan page
  is_current        boolean not null default true,
  started_on        date,
  code_system       text,
  code              text,
  show_on_scan      boolean not null default false,   -- private by default (critical ones are covered by alerts)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index medications_person_idx on public.medications (person_id);

create table public.emergency_contacts (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.people (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 60),   -- first name is enough: "Kasun"
  relationship   public.contact_relationship not null,
  phone_e164     text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),   -- +94770000000 / +971500000000
  email          text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),          -- for scan alerts (email first, SMS later)
  priority       smallint not null check (priority between 1 and 3),          -- 1..3 => at most 3 contacts
  notify_on_scan boolean not null default true,
  show_on_scan   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (person_id, priority)
);

-- One row per printed card / sticker / wallpaper. Several can be active at
-- once so a lost helmet sticker can be switched off without killing the card.
create table public.qr_tokens (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.people (id) on delete cascade,
  token      text not null unique check (token ~ '^[A-Za-z0-9_-]{24}$'),   -- 144 random bits
  label      text check (char_length(label) <= 40),                        -- "Wallet card", "Helmet sticker"
  status     public.token_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((status = 'revoked') = (revoked_at is not null))
);
create index qr_tokens_person_idx on public.qr_tokens (person_id);

-- Every scan. Location only if the person scanning taps "share location",
-- and rounded to ~100 m. No IP addresses are stored.
create table public.scan_events (
  id                  bigint generated always as identity primary key,
  person_id           uuid not null references public.people (id) on delete cascade,
  token_id            uuid references public.qr_tokens (id) on delete set null,
  scanned_at          timestamptz not null default now(),
  approx_lat          numeric(6,3) check (approx_lat between -90 and 90),
  approx_lng          numeric(6,3) check (approx_lng between -180 and 180),
  location_accuracy_m integer check (location_accuracy_m >= 0),
  location_added_at   timestamptz,
  country_code        text check (country_code ~ '^[A-Z]{2}$'),
  family_notified_at  timestamptz
);
create index scan_events_person_time_idx on public.scan_events (person_id, scanned_at desc);

-- Internal: per-visitor request counter for the scan endpoint.
-- "bucket" is a hash made by the Python backend; the raw IP never reaches the DB.
create table private.rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, window_start)
);


-- =====================================================================
--  3. HELPER FUNCTIONS
--  "security definer" = runs with the owner's rights, so it can look at
--  person_managers without tripping over that table's own RLS rules.
--  "set search_path = ''" = blocks a known hijacking trick; every name
--  inside is written in full (public.people, not people).
-- =====================================================================

create function private.is_manager(p_person_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.person_managers m
    where m.person_id = p_person_id and m.user_id = auth.uid()
  );
$$;

create function private.is_owner(p_person_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.person_managers m
    where m.person_id = p_person_id and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- For storage paths shaped "<person_id>/whatever.jpg"
create function private.is_manager_of_path(p_object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_first text := split_part(p_object_name, '/', 1);
begin
  if v_first !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return private.is_manager(v_first::uuid);
end;
$$;

create function private.new_token()
returns text language sql volatile set search_path = '' as $$
  -- 18 random bytes -> 24 URL-safe characters, no padding
  select translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
$$;

-- true = allowed, false = over the limit
create function private.hit_rate_limit(p_bucket text, p_max_per_minute integer)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  v_hits integer;
begin
  insert into private.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, date_trunc('minute', now()), 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- occasional clean-up of old counters
  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '1 hour';
  end if;

  return v_hits <= p_max_per_minute;
end;
$$;

-- The ONLY place that decides what a stranger may see.
-- Used by both the real scan and the owner's "Test your QR" preview,
-- so the preview is guaranteed to match reality.
create function private.build_public_profile(p_person_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'name',                coalesce(p.display_name, p.full_name),
    'age',                 case when p.show_age and p.date_of_birth is not null
                                then date_part('year', age(current_date, p.date_of_birth))::int end,
    'photo_path',          case when p.show_photo then p.photo_path end,
    'blood_group',         case when p.show_blood_group then p.blood_group end,
    'languages',           case when p.show_languages and cardinality(p.spoken_languages) > 0
                                then to_jsonb(p.spoken_languages) end,
    'communication_needs', case when p.show_communication_needs then p.communication_needs end,
    'organ_donor',         case when p.show_organ_donor then p.organ_donor end,
    'preferred_hospital',  case when p.show_preferred_hospital then p.preferred_hospital end,
    'insurer',             case when p.show_insurance then p.insurer_name end,
    'lost_person_mode',    p.lost_person_mode,
    'home_area',           case when p.lost_person_mode then p.home_area end,
    'updated_at',          greatest(p.content_updated_at, p.info_confirmed_at),

    'alerts', coalesce((
      select jsonb_agg(jsonb_build_object('code', a.code, 'note', a.note) order by a.code)
      from public.critical_alerts a
      where a.person_id = p.id and a.show_on_scan), '[]'::jsonb),

    'allergies', coalesce((
      select jsonb_agg(jsonb_build_object('substance', al.substance, 'reaction', al.reaction, 'severity', al.severity)
                       order by (al.severity = 'unknown'), al.severity desc, al.substance)
      from public.allergies al
      where al.person_id = p.id and al.show_on_scan), '[]'::jsonb),

    'conditions', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'since_year', c.since_year) order by c.since_year nulls last, c.name)
      from public.conditions c
      where c.person_id = p.id and c.show_on_scan), '[]'::jsonb),

    'medications', coalesce((
      select jsonb_agg(jsonb_build_object('name', m.name, 'dose', m.dose, 'frequency', m.frequency, 'kind', m.kind) order by m.name)
      from public.medications m
      where m.person_id = p.id and m.show_on_scan and m.is_current), '[]'::jsonb),

    'contacts', coalesce((
      select jsonb_agg(jsonb_build_object('name', ec.name, 'relationship', ec.relationship, 'phone', ec.phone_e164) order by ec.priority)
      from public.emergency_contacts ec
      where ec.person_id = p.id and ec.show_on_scan), '[]'::jsonb)
  ))
  from public.people p
  where p.id = p_person_id;
$$;


-- =====================================================================
--  4. TRIGGERS  (automatic bookkeeping)
-- =====================================================================

create function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function private.people_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.content_updated_at := now();
  return new;
end;
$$;

-- Any change to an alert / allergy / medicine etc. refreshes the person's
-- "Updated X days ago" date.
create function private.touch_person()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.people
     set content_updated_at = now()
   where id = coalesce(new.person_id, old.person_id);
  return null;
end;
$$;

-- New login -> app_users row
create function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.app_users (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

create trigger set_updated_at before update on public.app_users
  for each row execute function private.set_updated_at();
create trigger people_before_update before update on public.people
  for each row execute function private.people_before_update();

do $$
declare t text;
begin
  foreach t in array array['critical_alerts','allergies','conditions','medications','emergency_contacts'] loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function private.set_updated_at()', t);
    execute format('create trigger touch_person after insert or update or delete on public.%I
                    for each row execute function private.touch_person()', t);
  end loop;
end $$;


-- =====================================================================
--  5. ROW-LEVEL SECURITY
--  RLS is switched on for EVERY table. With RLS on and no matching policy,
--  the answer is "no rows", so anything not explicitly allowed is denied.
-- =====================================================================

alter table public.app_users          enable row level security;
alter table public.people             enable row level security;
alter table public.person_managers    enable row level security;
alter table public.critical_alerts    enable row level security;
alter table public.allergies          enable row level security;
alter table public.conditions         enable row level security;
alter table public.medications        enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.qr_tokens          enable row level security;
alter table public.scan_events        enable row level security;
alter table private.rate_limits       enable row level security;   -- no policies: nobody but the owner

-- app_users: your own row only
create policy "read own account"   on public.app_users for select to authenticated
  using (id = (select auth.uid()));
create policy "update own account" on public.app_users for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- people: managers read and edit; only the owner deletes.
-- No INSERT policy: new people are created through create_person(), which
-- also makes the creator the owner in the same step.
create policy "managers read person"   on public.people for select to authenticated
  using (private.is_manager(id));
create policy "managers update person" on public.people for update to authenticated
  using (private.is_manager(id)) with check (private.is_manager(id));
create policy "owner deletes person"   on public.people for delete to authenticated
  using (private.is_owner(id));

-- person_managers: see your own links and your co-managers.
-- Owner can remove anyone; anyone except the owner can remove themselves.
-- Adding managers = invite flow (milestone 4), done through a function.
create policy "see own and co-managers" on public.person_managers for select to authenticated
  using (user_id = (select auth.uid()) or private.is_manager(person_id));
create policy "owner removes, or leave" on public.person_managers for delete to authenticated
  using (private.is_owner(person_id) or (user_id = (select auth.uid()) and role <> 'owner'));

-- health tables: managers have full access to their people's rows
do $$
declare t text;
begin
  foreach t in array array['critical_alerts','allergies','conditions','medications','emergency_contacts'] loop
    execute format(
      'create policy "managers full access" on public.%I for all to authenticated
         using (private.is_manager(person_id)) with check (private.is_manager(person_id))', t);
  end loop;
end $$;

-- QR tokens and scan history: managers can read; changes only via functions
create policy "managers read tokens" on public.qr_tokens   for select to authenticated
  using (private.is_manager(person_id));
create policy "managers read scans"  on public.scan_events for select to authenticated
  using (private.is_manager(person_id));


-- =====================================================================
--  6. TABLE PERMISSIONS  (a second lock behind RLS)
--  The anonymous role gets NOTHING on any table. Logged-in users get only
--  the operations listed, and on people only the columns they may change.
-- =====================================================================

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select, update on public.app_users to authenticated;
grant select, delete on public.people to authenticated;
grant update (
  full_name, display_name, date_of_birth, photo_path, spoken_languages, blood_group,
  organ_donor, communication_needs, home_area, lost_person_mode, insurer_name,
  insurance_policy_number, preferred_hospital, show_photo, show_age, show_blood_group,
  show_languages, show_communication_needs, show_organ_donor, show_preferred_hospital,
  show_insurance, info_confirmed_at
) on public.people to authenticated;
grant select, delete on public.person_managers to authenticated;
grant select, insert, update, delete on
  public.critical_alerts, public.allergies, public.conditions,
  public.medications, public.emergency_contacts
  to authenticated;
grant select on public.qr_tokens, public.scan_events to authenticated;


-- =====================================================================
--  7. API FUNCTIONS
-- =====================================================================

-- Create a profile and become its owner, in one step.
create function public.create_person(p_full_name text, p_profile_for public.profile_for default 'other')
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  -- abuse guard: family plan is 5 profiles, leave some headroom
  if (select count(*) from public.person_managers where user_id = v_uid) >= 10 then
    raise exception 'profile limit reached' using errcode = 'P0001';
  end if;

  insert into public.people (full_name, created_by) values (p_full_name, v_uid) returning id into v_id;
  insert into public.person_managers (person_id, user_id, role, person_is_my)
       values (v_id, v_uid, 'owner', p_profile_for);
  return v_id;
end;
$$;

-- New QR (for a new card, sticker or wallpaper)
create function public.issue_qr_token(p_person_id uuid, p_label text default null)
returns public.qr_tokens language plpgsql volatile security definer set search_path = '' as $$
declare
  v_row public.qr_tokens;
begin
  if not private.is_manager(p_person_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.qr_tokens (person_id, token, label, created_by)
       values (p_person_id, private.new_token(), p_label, auth.uid())
    returning * into v_row;
  return v_row;
end;
$$;

-- "I lost my card": switch that QR off for good
create function public.revoke_qr_token(p_token_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.qr_tokens t
     set status = 'revoked', revoked_at = now()
   where t.id = p_token_id
     and t.status = 'active'
     and private.is_manager(t.person_id);
  if not found then
    raise exception 'not found or not allowed' using errcode = '42501';
  end if;
end;
$$;

-- "Test your QR": exactly what a stranger would see. Not logged as a scan.
create function public.preview_scan_profile(p_person_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_manager(p_person_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.build_public_profile(p_person_id);
end;
$$;

-- THE SCAN. Server key only (called from the Python backend, which renders
-- the scan page). p_client_key = hash of the visitor's IP, made by the backend.
create function public.get_scan_profile(p_token text, p_client_key text default null, p_country text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_token   public.qr_tokens;
  v_scan_id bigint;
begin
  if p_client_key is not null and not private.hit_rate_limit('scan:' || p_client_key, 30) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{24}$' then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_token from public.qr_tokens t where t.token = p_token;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_token.status <> 'active' then
    return jsonb_build_object('status', 'deactivated');
  end if;

  insert into public.scan_events (person_id, token_id, country_code)
       values (v_token.person_id, v_token.id,
               case when p_country ~ '^[A-Z]{2}$' then p_country end)
    returning id into v_scan_id;

  return jsonb_build_object(
    'status',  'ok',
    'scan_id', v_scan_id,
    'profile', private.build_public_profile(v_token.person_id)
  );
end;
$$;

-- The scanner tapped "Share my location with the family". Server key only.
-- Works once per scan, within 30 minutes, and only with the matching token.
create function public.add_scan_location(
  p_scan_id bigint, p_token text, p_lat double precision, p_lng double precision, p_accuracy_m integer default null)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return false;
  end if;

  update public.scan_events s
     set approx_lat          = round(p_lat::numeric, 3),
         approx_lng          = round(p_lng::numeric, 3),
         location_accuracy_m = greatest(p_accuracy_m, 0),
         location_added_at   = now()
    from public.qr_tokens t
   where s.id = p_scan_id
     and s.token_id = t.id
     and t.token = p_token
     and s.location_added_at is null
     and s.scanned_at > now() - interval '30 minutes';
  return found;
end;
$$;


-- =====================================================================
--  8. FUNCTION PERMISSIONS
--  Postgres lets everyone run new functions by default. Lock that down.
-- =====================================================================

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_manager(uuid)         to authenticated, service_role;
grant execute on function private.is_owner(uuid)           to authenticated, service_role;
grant execute on function private.is_manager_of_path(text) to authenticated, service_role;

revoke execute on function public.create_person(text, public.profile_for)      from public, anon;
revoke execute on function public.issue_qr_token(uuid, text)                   from public, anon;
revoke execute on function public.revoke_qr_token(uuid)                        from public, anon;
revoke execute on function public.preview_scan_profile(uuid)                   from public, anon;
grant  execute on function public.create_person(text, public.profile_for)      to authenticated;
grant  execute on function public.issue_qr_token(uuid, text)                   to authenticated;
grant  execute on function public.revoke_qr_token(uuid)                        to authenticated;
grant  execute on function public.preview_scan_profile(uuid)                   to authenticated;

revoke execute on function public.get_scan_profile(text, text, text) from public, anon, authenticated;
revoke execute on function public.add_scan_location(bigint, text, double precision, double precision, integer)
  from public, anon, authenticated;
grant  execute on function public.get_scan_profile(text, text, text) to service_role;
grant  execute on function public.add_scan_location(bigint, text, double precision, double precision, integer)
  to service_role;




-- Section 9 (file storage) moved to its own migration:
-- 20261012000050_storage_bucket.sql
--
-- Why: the Supabase CLI applies this file while the `db` container is
-- still starting up, before the separate `storage-api` container has
-- created its own storage.buckets / storage.objects tables. Statements
-- that touch storage.* must live in a later migration file so they run
-- as their own step, after Storage has initialised.
