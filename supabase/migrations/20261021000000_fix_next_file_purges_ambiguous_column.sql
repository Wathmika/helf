-- Fix: next_file_purges() fails every run with
--   ERROR 42702: column reference "person_id" is ambiguous
--   ("It could refer to either a PL/pgSQL variable or a table column.")
--
-- Cause: the function's `returns table (person_id uuid, object_names text[])`
-- declares `person_id` as a PL/pgSQL output parameter, which is visible
-- throughout the function body. The inner `select person_id from
-- private.file_purge_queue` (used to pick which rows to update) referenced
-- `person_id` unqualified, so Postgres couldn't tell whether that meant the
-- table column or the output variable -- and has rejected every invocation
-- of this function since it was created, meaning the purge-person-files
-- cron job (every 15 minutes) has never successfully deleted a photo.
--
-- Fix: qualify every reference to the queue table's column with its alias.
create or replace function public.next_file_purges(p_limit integer default 20)
returns table (person_id uuid, object_names text[]) language plpgsql volatile security definer set search_path = '' as $$
begin
  return query
  with picked as (
    update private.file_purge_queue q
       set attempts = q.attempts + 1
     where q.person_id in (select inner_q.person_id from private.file_purge_queue inner_q
                            where inner_q.attempts < 10 order by inner_q.queued_at limit p_limit)
    returning q.person_id
  )
  select pk.person_id,
         coalesce(array(select o.name from storage.objects o
                         where o.bucket_id = 'person-photos'
                           and o.name like pk.person_id::text || '/%'), '{}')
    from picked pk;
end;
$$;
