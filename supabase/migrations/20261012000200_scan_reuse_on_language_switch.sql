-- =====================================================================
--  [Product Name] — migration 3: switching language on the scan page
--  must not count (or alert the family) as a new scan.
--
--  get_scan_profile gains p_existing_scan_id. When the backend passes the
--  id of a scan made with the SAME token in the last 30 minutes, that scan
--  is reused instead of a new one being logged.
-- =====================================================================

drop function public.get_scan_profile(text, text, text);

create function public.get_scan_profile(
  p_token text, p_client_key text default null, p_country text default null, p_existing_scan_id bigint default null)
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

  if p_existing_scan_id is not null then
    select s.id into v_scan_id from public.scan_events s
     where s.id = p_existing_scan_id
       and s.token_id = v_token.id
       and s.scanned_at > now() - interval '30 minutes';
  end if;

  if v_scan_id is null then
    insert into public.scan_events (person_id, token_id, country_code)
         values (v_token.person_id, v_token.id,
                 case when p_country ~ '^[A-Z]{2}$' then p_country end)
      returning id into v_scan_id;
  end if;

  return jsonb_build_object(
    'status',  'ok',
    'scan_id', v_scan_id,
    'profile', private.build_public_profile(v_token.person_id)
  );
end;
$$;

revoke execute on function public.get_scan_profile(text, text, text, bigint) from public, anon, authenticated;
grant  execute on function public.get_scan_profile(text, text, text, bigint) to service_role;
