-- =====================================================================
--  [Product Name] — migration 4: scan alerts by SMS, not just email
--
--  Why: in Sri Lanka, SMS is read far more reliably and quickly than email,
--  especially in an emergency. Email alone also silently excluded any
--  emergency contact who had a phone number but no email on file -- they
--  were never counted as a recipient at all, with no sign of that gap
--  anywhere. This migration:
--   1. Stops requiring an email to count someone as a notifiable contact
--      -- notify_on_scan alone now qualifies them (matching what the
--      emergency_contacts table already intended: phone_e164 is NOT NULL,
--      email is optional).
--   2. Returns each recipient's phone alongside their email, so the
--      backend can send SMS, email, or both per contact.
--  No table changes needed -- phone_e164 was already on every contact row.
-- =====================================================================

drop function public.scan_notification_payload(bigint, text);

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

  -- notify_on_scan alone qualifies a contact now; email is no longer required.
  -- phone_e164 is NOT NULL on every contact row, so every recipient here has
  -- at least a phone; email may or may not be present.
  select coalesce(jsonb_agg(jsonb_build_object('name', ec.name, 'email', ec.email, 'phone', ec.phone_e164)
                            order by ec.priority), '[]'::jsonb)
    into v_recipients
    from public.emergency_contacts ec
   where ec.person_id = v_scan.person_id and ec.notify_on_scan;

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

revoke execute on function public.scan_notification_payload(bigint, text) from public, anon, authenticated;
grant  execute on function public.scan_notification_payload(bigint, text) to service_role;
