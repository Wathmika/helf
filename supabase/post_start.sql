-- =====================================================================
--  RUN THIS MANUALLY, ONCE, AFTER `supabase start` FINISHES.
--  This is NOT a migration and does not run automatically.
--
--  Why: on `supabase start` / `supabase db reset`, the CLI applies
--  everything in supabase/migrations/ while the database container is
--  still starting, before the separate storage-api container has created
--  the storage schema (storage.buckets, storage.objects). Any statement
--  here that touches storage.* fails with "relation storage.buckets (or
--  storage.objects) does not exist" if it's placed in a migration file,
--  no matter how it's numbered or split up.
--
--  The bucket itself is declared in supabase/config.toml
--  ([storage.buckets.person-photos]) — the CLI creates it after
--  storage-api is ready, so that part needs no manual step.
--
--  These RLS policies on storage.objects are the one piece left that
--  needs the storage schema to exist first. Running this file by hand
--  after `supabase start` has fully completed guarantees every container,
--  storage-api included, is already up — so there's no ordering problem.
--
--  How to run it, after `supabase start` finishes — easiest option,
--  no extra tools needed: open the SQL editor in your browser at
--    http://127.0.0.1:54323/project/default/sql/new
--  paste this file's contents (everything below the dashes), and click
--  "Run".
--
--  Or, if you have `psql` installed, from the project root:
--    psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/post_start.sql
--  (54322 is the local database port; confirm it with `npx supabase status`
--  if you changed it)
--
--  Safe to run more than once: each policy is dropped first if it
--  already exists, so re-running after a `supabase stop` / `start` cycle
--  just recreates them.
-- =====================================================================

drop policy if exists "managers read person photos"    on storage.objects;
drop policy if exists "managers upload person photos"  on storage.objects;
drop policy if exists "managers replace person photos" on storage.objects;
drop policy if exists "managers delete person photos"  on storage.objects;

create policy "managers read person photos" on storage.objects for select to authenticated
  using (bucket_id = 'person-photos' and private.is_manager_of_path(name));
create policy "managers upload person photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'person-photos' and private.is_manager_of_path(name));
create policy "managers replace person photos" on storage.objects for update to authenticated
  using (bucket_id = 'person-photos' and private.is_manager_of_path(name))
  with check (bucket_id = 'person-photos' and private.is_manager_of_path(name));
create policy "managers delete person photos" on storage.objects for delete to authenticated
  using (bucket_id = 'person-photos' and private.is_manager_of_path(name));