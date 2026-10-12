-- =====================================================================
--  [Product Name] — migration 2: family sharing, offline QR text,
--  scan alerts, and privacy rights (export, account deletion, file purge)
-- =====================================================================
--
--  What this adds, in plain words:
--   A. Co-managers can see each other's display name ("Nadeesha also manages Amma").
--   B. Family invites: the owner creates a one-time link; a relative opens
--      it, logs in, and becomes an editor of that profile.
--   C. offline_qr_text(): the short English text printed INSIDE the offline QR.
--   D. Scan alerts: every scan (and every "share location" tap) calls the
--      notify-family endpoint of the Python backend, which emails the emergency contacts.
--   E. export_person_data(): everything we hold about a person, as JSON
--      (PDPA "right of access").
--   F. prepare_account_deletion(): hands profiles over to co-managers or
--      deletes them, before the login itself is deleted.
--   G. Photo clean-up queue: when a person is deleted, their photos are
--      removed from storage by a scheduled job.
--   H. Daily maintenance: drop scan locations after 90 days, clear old
--      counters and expired invites.
--
--  Needs two Supabase extensions that are available on every project:
--    pg_net  (lets the database call an HTTP endpoint)
--    pg_cron (runs scheduled jobs)
--  plus Vault (built in) to keep the endpoint secrets out of this file.
-- =====================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;


-- =====================================================================
--  A. Co-managers can read each other's display name
-- =====================================================================

create function private.shares_person_with(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.person_managers mine
      join public.person_managers theirs on theirs.person_id = mine.person_id
     where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  );
$$;

create policy "co-managers read each other" on public.app_users for select to authenticated
  using (private.shares_person_with(id));


-- =====================================================================
--  B. Family invites
--  The invite code is shown ONCE to the owner (to send by WhatsApp).
--  Only a hash of it is stored, so even someone reading the database
--  can't use a pending invite.
-- =====================================================================

create table public.person_invites (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.people (id) on delete cascade,
  code_hash   text not null unique,
  role        public.manager_role not null default 'editor' check (role = 'editor'),
  note        text check (char_length(note) <= 60),            -- "For Nadeesha"
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  revoked_at  timestamptz
);
create index person_invites_person_idx on public.person_invites (person_id);

alter table public.person_invites enable row level security;
create policy "managers see invites" on public.person_invites for select to authenticated
  using (private.is_manager(person_id));

revoke all on public.person_invites from anon, authenticated;
grant select (id, person_id, role, note, created_by, created_at, expires_at, accepted_by, accepted_at, revoked_at)
  on public.person_invites to authenticated;   -- note: code_hash is NOT readable

create function private.hash_code(p_code text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_code, 'sha256'), 'hex');
$$;

-- Owner creates an invite. Returns the code to put in the link.
create function public.create_person_invite(p_person_id uuid, p_note text default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  v_code text := private.new_token();
begin
  if not private.is_owner(p_person_id) then
    raise exception 'only the owner can invite' using errcode = '42501';
  end if;
  if (select count(*) from public.person_invites i
       where i.person_id = p_person_id and i.accepted_at is null
         and i.revoked_at is null and i.expires_at > now()) >= 5 then
    raise exception 'too many open invites' using errcode = 'P0001';
  end if;

  insert into public.person_invites (person_id, code_hash, note, created_by)
       values (p_person_id, private.hash_code(v_code), p_note, auth.uid());
  return v_code;
end;
$$;

-- A relative accepts. Returns the person's id.
create function public.accept_person_invite(p_code text, p_person_is_my public.profile_for default 'parent')
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid    uuid := auth.uid();
  v_invite public.person_invites;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not private.hit_rate_limit('invite:' || v_uid::text, 10) then
    raise exception 'too many attempts, try again in a minute' using errcode = 'P0001';
  end if;
  if p_code is null or p_code !~ '^[A-Za-z0-9_-]{24}$' then
    raise exception 'invite not valid' using errcode = 'P0002';
  end if;

  select * into v_invite from public.person_invites i
   where i.code_hash = private.hash_code(p_code)
   for update;

  if not found or v_invite.accepted_at is not null or v_invite.revoked_at is not null
     or v_invite.expires_at <= now() then
    raise exception 'invite not valid' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.person_managers m where m.person_id = v_invite.person_id and m.user_id = v_uid) then
    raise exception 'you already manage this profile' using errcode = 'P0001';
  end if;
  if (select count(*) from public.person_managers where user_id = v_uid) >= 10 then
    raise exception 'profile limit reached' using errcode = 'P0001';
  end if;

  insert into public.person_managers (person_id, user_id, role, person_is_my)
       values (v_invite.person_id, v_uid, v_invite.role, p_person_is_my);
  update public.person_invites set accepted_by = v_uid, accepted_at = now() where id = v_invite.id;
  return v_invite.person_id;
end;
$$;

create function public.revoke_person_invite(p_invite_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.person_invites i
     set revoked_at = now()
   where i.id = p_invite_id and i.accepted_at is null and i.revoked_at is null
     and private.is_owner(i.person_id);
  if not found then
    raise exception 'not found or not allowed' using errcode = '42501';
  end if;
end;
$$;


-- =====================================================================
--  C. Offline QR text
--  Plain English text stored INSIDE the QR, readable with no internet.
--  Uses only "show when scanned" items. Keeps the text within 300 bytes
--  by dropping lower-priority lines first, then adds the online link.
--  Anything in here can't be changed or switched off once printed.
-- =====================================================================

create function private.alert_label_en(p_code public.alert_code)
returns text language sql immutable set search_path = '' as $$
  select case p_code
    when 'blood_thinner'      then 'BLOOD THINNER'
    when 'diabetes_insulin'   then 'DIABETIC ON INSULIN'
    when 'epilepsy'           then 'EPILEPSY'
    when 'heart_condition'    then 'HEART CONDITION'
    when 'pacemaker_implant'  then 'PACEMAKER/IMPLANT'
    when 'severe_allergy'     then 'SEVERE ALLERGY'
    when 'pregnancy'          then 'PREGNANT'
    when 'dementia'           then 'DEMENTIA'
    when 'hearing_impairment' then 'HEARING IMPAIRED'
    when 'vision_impairment'  then 'VISION IMPAIRED'
  end;
$$;

create function private.build_offline_qr_text(p_person_id uuid, p_link text, p_budget_bytes integer default 300)
returns text language sql stable security definer set search_path = '' as $$
  with p as (
    select * from public.people where id = p_person_id
  ),
  lines (prio, ord, line) as (
              select 0, 0, 'EMERGENCY MEDICAL INFO'
    union all select 1, 1, coalesce(p.display_name, p.full_name)
                       || case when p.show_age and p.date_of_birth is not null
                               then ', ' || date_part('year', age(current_date, p.date_of_birth))::int else '' end
                from p
    union all select 2, 10 + row_number() over (order by a.code),
                     '!! ' || private.alert_label_en(a.code) || coalesce(': ' || a.note, '')
                from public.critical_alerts a where a.person_id = p_person_id and a.show_on_scan
    union all select 3, 20 + row_number() over (order by (al.severity = 'unknown'), al.severity desc, al.substance),
                     'Allergy: ' || al.substance || case when al.severity <> 'unknown' then ' (' || replace(al.severity::text, '_', '-') || ')' else '' end
                from public.allergies al where al.person_id = p_person_id and al.show_on_scan
    union all select case when ec.priority = 1 then 4 else 7 end, 30 + ec.priority,
                     'Call ' || ec.name || ' (' || ec.relationship || ') ' || ec.phone_e164
                from public.emergency_contacts ec where ec.person_id = p_person_id and ec.show_on_scan
    union all select 5, 90, 'Ambulance: 1990'
    union all select 6, 91, 'Info dated ' || to_char(greatest(p.content_updated_at, p.info_confirmed_at) at time zone 'Asia/Colombo', 'YYYY-MM-DD')
                from p
    union all select 8, 40 + row_number() over (order by c.since_year nulls last, c.name),
                     'Has: ' || c.name
                from public.conditions c where c.person_id = p_person_id and c.show_on_scan
    union all select 9, 50, 'Note: ' || p.communication_needs
                from p where p.show_communication_needs and p.communication_needs is not null
    union all select 10, 51, 'Blood group (info only): ' || p.blood_group
                from p where p.show_blood_group and p.blood_group is not null and p.blood_group <> 'unknown'
  ),
  ranked as (
    select ord, line,
           sum(octet_length(line) + 1) over (order by prio, ord rows unbounded preceding) as running_bytes
      from lines
  )
  select string_agg(line, E'\n' order by ord) || E'\n' || 'More: ' || p_link
    from ranked
   where running_bytes <= p_budget_bytes;
$$;

-- For the QR screen and the printable card. p_base_url is the site
-- address, e.g. https://example.lk (no trailing slash).
create function public.offline_qr_text(p_token_id uuid, p_base_url text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_token public.qr_tokens;
begin
  if p_base_url !~ '^(https://[a-z0-9.-]+|http://localhost(:[0-9]+)?)$' then
    raise exception 'base url must be https://domain (or http://localhost for development)' using errcode = '22023';
  end if;
  select * into v_token from public.qr_tokens t where t.id = p_token_id;
  if not found or not private.is_manager(v_token.person_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_token.status <> 'active' then
    raise exception 'this QR has been deactivated' using errcode = 'P0001';
  end if;
  return private.build_offline_qr_text(v_token.person_id, p_base_url || '/s/' || v_token.token);
end;
$$;


-- =====================================================================
--  D. Scan alerts to the family
--  The database calls the backend's notify-family endpoint after each scan
--  and after each "share location" tap. The function's address and a
--  shared secret are kept in Vault (set up once, see the setup guide).
--  If they're not set (e.g. on your laptop), nothing is sent.
-- =====================================================================

alter table public.scan_events add column location_notified_at timestamptz;

create function private.vault_secret(p_name text)
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;

create function private.call_notify_family()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url    text := private.vault_secret('notify_family_url');
  v_secret text := private.vault_secret('notify_family_secret');
begin
  if v_url is null or v_secret is null then
    return null;
  end if;
  perform net.http_post(
    url                  := v_url,
    body                 := jsonb_build_object('scan_id', new.id,
                                               'kind', case when tg_op = 'INSERT' then 'scan' else 'location' end),
    headers              := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

create trigger notify_family_after_scan
  after insert on public.scan_events
  for each row execute function private.call_notify_family();

create trigger notify_family_after_location
  after update of location_added_at on public.scan_events
  for each row
  when (old.location_added_at is null and new.location_added_at is not null)
  execute function private.call_notify_family();

-- What the backend needs to write the email. Decides whether to
-- send at all: a normal scan alerts the family at most once per 10 minutes
-- per person; a location share is always sent (once per scan).
-- No health details are included, only the name, time and location.
create function public.scan_notification_payload(p_scan_id bigint, p_kind text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_scan       public.scan_events;
  v_person     public.people;
  v_recipients jsonb;
  v_send       boolean;
  v_reason     text;
begin
  select * into v_scan from public.scan_events where id = p_scan_id;
  if not found then
    return jsonb_build_object('send', false, 'reason', 'scan_not_found');
  end if;
  select * into v_person from public.people where id = v_scan.person_id;

  select coalesce(jsonb_agg(jsonb_build_object('name', ec.name, 'email', ec.email) order by ec.priority), '[]'::jsonb)
    into v_recipients
    from public.emergency_contacts ec
   where ec.person_id = v_scan.person_id and ec.notify_on_scan and ec.email is not null;

  if jsonb_array_length(v_recipients) = 0 then
    v_send := false; v_reason := 'no_recipients';
  elsif p_kind = 'scan' and v_scan.family_notified_at is not null then
    v_send := false; v_reason := 'already_sent';
  elsif p_kind = 'scan' and exists (
          select 1 from public.scan_events s
           where s.person_id = v_scan.person_id and s.id <> v_scan.id
             and s.family_notified_at > now() - interval '10 minutes') then
    v_send := false; v_reason := 'throttled';
  elsif p_kind = 'location' and (v_scan.approx_lat is null or v_scan.location_notified_at is not null) then
    v_send := false; v_reason := 'no_location_or_already_sent';
  elsif p_kind not in ('scan', 'location') then
    v_send := false; v_reason := 'bad_kind';
  else
    v_send := true; v_reason := null;
  end if;

  return jsonb_build_object(
    'send',         v_send,
    'reason',       v_reason,
    'kind',         p_kind,
    'person_name',  coalesce(v_person.display_name, v_person.full_name),
    'scanned_at',   v_scan.scanned_at,
    'lat',          v_scan.approx_lat,
    'lng',          v_scan.approx_lng,
    'accuracy_m',   v_scan.location_accuracy_m,
    'recipients',   case when v_send then v_recipients else '[]'::jsonb end
  );
end;
$$;

create function public.mark_scan_notified(p_scan_id bigint, p_kind text)
returns void language sql volatile security definer set search_path = '' as $$
  update public.scan_events
     set family_notified_at   = case when p_kind = 'scan'     then now() else family_notified_at end,
         location_notified_at = case when p_kind = 'location' then now() else location_notified_at end
   where id = p_scan_id;
$$;


-- =====================================================================
--  E. Data export (PDPA right of access) — everything about one person
-- =====================================================================

create function public.export_person_data(p_person_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_manager(p_person_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'exported_at',        now(),
    'person',             (select to_jsonb(p) from public.people p where p.id = p_person_id),
    'critical_alerts',    coalesce((select jsonb_agg(to_jsonb(x)) from public.critical_alerts x    where x.person_id = p_person_id), '[]'),
    'allergies',          coalesce((select jsonb_agg(to_jsonb(x)) from public.allergies x          where x.person_id = p_person_id), '[]'),
    'conditions',         coalesce((select jsonb_agg(to_jsonb(x)) from public.conditions x         where x.person_id = p_person_id), '[]'),
    'medications',        coalesce((select jsonb_agg(to_jsonb(x)) from public.medications x        where x.person_id = p_person_id), '[]'),
    'emergency_contacts', coalesce((select jsonb_agg(to_jsonb(x)) from public.emergency_contacts x where x.person_id = p_person_id), '[]'),
    'managers',           coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'role', m.role, 'since', m.created_at))
                                      from public.person_managers m where m.person_id = p_person_id), '[]'),
    'qr_codes',           coalesce((select jsonb_agg(jsonb_build_object('label', t.label, 'status', t.status,
                                                                        'created_at', t.created_at, 'revoked_at', t.revoked_at))
                                      from public.qr_tokens t where t.person_id = p_person_id), '[]'),
    'scans',              coalesce((select jsonb_agg(jsonb_build_object('scanned_at', s.scanned_at, 'country', s.country_code,
                                                                        'approx_lat', s.approx_lat, 'approx_lng', s.approx_lng,
                                                                        'family_notified_at', s.family_notified_at)
                                                     order by s.scanned_at desc)
                                      from public.scan_events s where s.person_id = p_person_id), '[]')
  );
end;
$$;


-- =====================================================================
--  F. Account deletion (step 1 of 2; step 2 is the delete-account
--  backend's /account/delete endpoint removing the login itself)
--  For each profile the user OWNS:
--    - if someone else also manages it, the longest-standing co-manager
--      becomes the owner, so the family doesn't lose Amma's profile;
--    - otherwise the profile is deleted.
-- =====================================================================

create function public.prepare_account_deletion(p_user_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  r           record;
  v_heir      uuid;
  v_handed    integer := 0;
  v_deleted   integer := 0;
begin
  for r in select m.person_id from public.person_managers m
            where m.user_id = p_user_id and m.role = 'owner'
  loop
    select m.user_id into v_heir from public.person_managers m
     where m.person_id = r.person_id and m.user_id <> p_user_id
     order by m.created_at limit 1;

    if v_heir is not null then
      update public.person_managers set role = 'owner'
       where person_id = r.person_id and user_id = v_heir;
      v_handed := v_handed + 1;
    else
      delete from public.people where id = r.person_id;
      v_deleted := v_deleted + 1;
    end if;
  end loop;

  return jsonb_build_object('profiles_handed_over', v_handed, 'profiles_deleted', v_deleted);
end;
$$;


-- =====================================================================
--  G. Photo clean-up queue
--  Deleting a person removes their database rows at once, but photo files
--  live in Storage and must be removed through the Storage API (deleting
--  rows in storage.objects directly would leave the files behind).
--  So deletions are queued here and the backend's purge-files endpoint,
--  run every 15 minutes, removes the files.
-- =====================================================================

create table private.file_purge_queue (
  person_id uuid primary key,
  queued_at timestamptz not null default now(),
  attempts  integer not null default 0
);
alter table private.file_purge_queue enable row level security;

create function private.queue_file_purge()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into private.file_purge_queue (person_id) values (old.id) on conflict do nothing;
  return null;
end;
$$;

create trigger queue_file_purge after delete on public.people
  for each row execute function private.queue_file_purge();

-- language plpgsql (not sql) on purpose: a `language sql` function body is
-- validated against the real schema at CREATE time, so a reference to
-- storage.objects here would fail during `supabase start` / `db reset`,
-- before the storage-api container has created that table. plpgsql bodies
-- are only checked for syntax at creation time, not resolved against the
-- schema until the function actually runs (which, for this function, is
-- well after startup, from the /internal/purge-files backend endpoint) —
-- so this form is safe to apply as a migration regardless of container order.
create function public.next_file_purges(p_limit integer default 20)
returns table (person_id uuid, object_names text[]) language plpgsql volatile security definer set search_path = '' as $$
begin
  return query
  with picked as (
    update private.file_purge_queue q
       set attempts = q.attempts + 1
     where q.person_id in (select person_id from private.file_purge_queue
                            where attempts < 10 order by queued_at limit p_limit)
    returning q.person_id
  )
  select pk.person_id,
         coalesce(array(select o.name from storage.objects o
                         where o.bucket_id = 'person-photos'
                           and o.name like pk.person_id::text || '/%'), '{}')
    from picked pk;
end;
$$;

create function public.complete_file_purge(p_person_id uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if exists (select 1 from storage.objects o
              where o.bucket_id = 'person-photos' and o.name like p_person_id::text || '/%') then
    return false;   -- files still there; try again next run
  end if;
  delete from private.file_purge_queue where person_id = p_person_id;
  return true;
end;
$$;


-- =====================================================================
--  H. Daily maintenance (data minimisation)
-- =====================================================================

create function private.daily_maintenance()
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  -- keep the fact that a scan happened, but forget WHERE after 90 days
  update public.scan_events
     set approx_lat = null, approx_lng = null, location_accuracy_m = null
   where scanned_at < now() - interval '90 days' and approx_lat is not null;

  delete from private.rate_limits where window_start < now() - interval '1 hour';

  delete from public.person_invites
   where accepted_at is null and expires_at < now() - interval '30 days';
end;
$$;

-- Scheduled jobs. The purge job reads its address and secret from Vault
-- at run time, so nothing secret is written in this file.
select cron.schedule('daily-maintenance', '30 20 * * *', $job$ select private.daily_maintenance(); $job$);  -- 02:00 Sri Lanka time
select cron.schedule('purge-person-files', '*/15 * * * *', $job$
  select net.http_post(
           url     := private.vault_secret('purge_files_url'),
           body    := '{}'::jsonb,
           headers := jsonb_build_object('Content-Type', 'application/json',
                                         'x-internal-secret', private.vault_secret('purge_files_secret')))
   where private.vault_secret('purge_files_url') is not null
     and exists (select 1 from private.file_purge_queue);
$job$);


-- =====================================================================
--  PERMISSIONS for everything above
-- =====================================================================

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_manager(uuid)         to authenticated, service_role;
grant execute on function private.is_owner(uuid)           to authenticated, service_role;
grant execute on function private.is_manager_of_path(text) to authenticated, service_role;
grant execute on function private.shares_person_with(uuid) to authenticated, service_role;

-- logged-in users
revoke execute on function public.create_person_invite(uuid, text)                 from public, anon;
revoke execute on function public.accept_person_invite(text, public.profile_for)   from public, anon;
revoke execute on function public.revoke_person_invite(uuid)                       from public, anon;
revoke execute on function public.offline_qr_text(uuid, text)                      from public, anon;
revoke execute on function public.export_person_data(uuid)                         from public, anon;
grant  execute on function public.create_person_invite(uuid, text)                 to authenticated;
grant  execute on function public.accept_person_invite(text, public.profile_for)   to authenticated;
grant  execute on function public.revoke_person_invite(uuid)                       to authenticated;
grant  execute on function public.offline_qr_text(uuid, text)                      to authenticated;
grant  execute on function public.export_person_data(uuid)                         to authenticated;

-- server only (the Python backend, using the secret key)
revoke execute on function public.scan_notification_payload(bigint, text) from public, anon, authenticated;
revoke execute on function public.mark_scan_notified(bigint, text)        from public, anon, authenticated;
revoke execute on function public.prepare_account_deletion(uuid)          from public, anon, authenticated;
revoke execute on function public.next_file_purges(integer)               from public, anon, authenticated;
revoke execute on function public.complete_file_purge(uuid)               from public, anon, authenticated;
grant  execute on function public.scan_notification_payload(bigint, text) to service_role;
grant  execute on function public.mark_scan_notified(bigint, text)        to service_role;
grant  execute on function public.prepare_account_deletion(uuid)          to service_role;
grant  execute on function public.next_file_purges(integer)               to service_role;
grant  execute on function public.complete_file_purge(uuid)               to service_role;
