-- ============================================================
--  Madrasati ERP — Storage buckets & policies
--  Run AFTER 0001–0005. Creates the buckets the Branding / Students /
--  Reports modules use, with school-scoped access via RLS on storage.objects.
--  Convention: object path = "<school_id>/<rest...>" so policies can scope by
--  the first path segment.
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('school-branding', 'school-branding', true),   -- logos/stamps/signatures (public read)
  ('student-photos',  'student-photos',  false),  -- private
  ('reports',         'reports',         false)   -- generated PDFs (private)
on conflict (id) do nothing;

-- Public read for branding assets (logos appear on login, reports, portals).
drop policy if exists branding_read on storage.objects;
create policy branding_read on storage.objects for select
  using (bucket_id = 'school-branding');

-- Branding writes: branding:write within the owning school (path prefix = school_id).
drop policy if exists branding_write on storage.objects;
create policy branding_write on storage.objects for all to authenticated
  using (
    bucket_id = 'school-branding'
    and public.has_perm('branding:write')
    and (storage.foldername(name))[1] = public.current_school_id()::text
  )
  with check (
    bucket_id = 'school-branding'
    and public.has_perm('branding:write')
    and (storage.foldername(name))[1] = public.current_school_id()::text
  );

-- Student photos: students:read to view, students:write to manage; school-scoped.
drop policy if exists student_photos_read on storage.objects;
create policy student_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'student-photos'
    and public.has_perm('students:read')
    and (storage.foldername(name))[1] = public.current_school_id()::text
  );
drop policy if exists student_photos_write on storage.objects;
create policy student_photos_write on storage.objects for all to authenticated
  using (
    bucket_id = 'student-photos'
    and public.has_perm('students:write')
    and (storage.foldername(name))[1] = public.current_school_id()::text
  )
  with check (
    bucket_id = 'student-photos'
    and public.has_perm('students:write')
    and (storage.foldername(name))[1] = public.current_school_id()::text
  );

-- Generated reports: reports:read, school-scoped.
drop policy if exists reports_read on storage.objects;
create policy reports_read on storage.objects for select to authenticated
  using (
    bucket_id = 'reports'
    and public.has_perm('reports:read')
    and (storage.foldername(name))[1] = public.current_school_id()::text
  );
