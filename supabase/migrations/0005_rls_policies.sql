-- ============================================================
--  Madrasati ERP — 0005 · Row Level Security
--  Tenant isolation (in_my_school) + permission checks (has_perm), driven by
--  the helpers in 0001. Run AFTER all tables exist.
-- ============================================================

-- ------------------------------------------------------------
--  Reference tables: readable by any authenticated user.
-- ------------------------------------------------------------
do $$
declare r text;
begin
  foreach r in array array['roles','permissions','role_permissions','quran_surahs'] loop
    execute format('alter table public.%I enable row level security', r);
    execute format('drop policy if exists %I on public.%I', r||'_sel', r);
    execute format('create policy %I on public.%I for select to authenticated using (true)', r||'_sel', r);
    -- only super_admin may mutate the RBAC matrix
    execute format('drop policy if exists %I on public.%I', r||'_admin', r);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin())', r||'_admin', r);
  end loop;
end $$;

-- ------------------------------------------------------------
--  Standard pattern: school-scoped tables with read/write perms.
--  (table, read_permission, write_permission)
-- ------------------------------------------------------------
do $$
declare rec record;
begin
  for rec in
    select * from (values
      ('academic_years','reports:read','settings:write'),
      ('school_stages','reports:read','settings:write'),
      ('grade_levels','reports:read','settings:write'),
      ('departments','departments:read','departments:write'),
      ('staff','teachers:read','teachers:write'),
      ('classes','classes:read','classes:write'),
      ('subjects','subjects:read','subjects:write'),
      ('teaching_assignments','classes:read','teachers:write'),
      ('students','students:read','students:write'),
      ('guardians','students:read','students:write'),
      ('student_enrollments','students:read','students:write'),
      ('attendance_records','attendance:read','attendance:write'),
      ('grade_scales','grades:read','settings:write'),
      ('assessment_types','grades:read','grades:write'),
      ('assessments','grades:read','grades:write'),
      ('grades','grades:read','grades:write'),
      ('report_cards','reports:read','grades:write'),
      ('quran_memorization','islamic:read','islamic:write'),
      ('quran_revisions','islamic:read','islamic:write'),
      ('curriculum_plans','curriculum:read','curriculum:write'),
      ('curriculum_coverage','curriculum:read','curriculum:write'),
      ('behavior_records','behavior:read','behavior:write'),
      ('rooms','timetable:read','timetable:write'),
      ('periods','timetable:read','timetable:write'),
      ('timetable_slots','timetable:read','timetable:write'),
      ('activities','activities:read','activities:write'),
      ('observations','observations:read','observations:write'),
      ('report_templates','reports:read','branding:write'),
      ('message_log','reports:read','communication:send'),
      ('fee_structures','finance:read','finance:write'),
      ('invoices','finance:read','finance:write'),
      ('payments','finance:read','finance:write')
    ) as t(tbl, rperm, wperm)
  loop
    execute format('alter table public.%I enable row level security', rec.tbl);

    execute format('drop policy if exists %I on public.%I', rec.tbl||'_sel', rec.tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.in_my_school(school_id) and public.has_perm(%L))',
      rec.tbl||'_sel', rec.tbl, rec.rperm);

    execute format('drop policy if exists %I on public.%I', rec.tbl||'_ins', rec.tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.in_my_school(school_id) and public.has_perm(%L))',
      rec.tbl||'_ins', rec.tbl, rec.wperm);

    execute format('drop policy if exists %I on public.%I', rec.tbl||'_upd', rec.tbl);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.in_my_school(school_id) and public.has_perm(%L)) with check (public.in_my_school(school_id) and public.has_perm(%L))',
      rec.tbl||'_upd', rec.tbl, rec.wperm, rec.wperm);

    execute format('drop policy if exists %I on public.%I', rec.tbl||'_del', rec.tbl);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.in_my_school(school_id) and public.has_perm(%L))',
      rec.tbl||'_del', rec.tbl, rec.wperm);
  end loop;
end $$;

-- ------------------------------------------------------------
--  SCHOOLS — membership-scoped; branding/settings perms to mutate.
-- ------------------------------------------------------------
alter table public.schools enable row level security;
drop policy if exists schools_sel on public.schools;
create policy schools_sel on public.schools for select to authenticated
  using (public.is_super_admin() or id = public.current_school_id());
drop policy if exists schools_upd on public.schools;
create policy schools_upd on public.schools for update to authenticated
  using (public.in_my_school(id) and (public.has_perm('settings:write') or public.has_perm('branding:write')))
  with check (public.in_my_school(id) and (public.has_perm('settings:write') or public.has_perm('branding:write')));
drop policy if exists schools_ins on public.schools;
create policy schools_ins on public.schools for insert to authenticated
  with check (public.is_super_admin());

-- ------------------------------------------------------------
--  PROFILES — own row, or same-school admins (users:manage).
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
drop policy if exists profiles_sel on public.profiles;
create policy profiles_sel on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super_admin()
         or (school_id = public.current_school_id() and public.has_perm('users:manage')));
drop policy if exists profiles_upd on public.profiles;
create policy profiles_upd on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_super_admin()
         or (school_id = public.current_school_id() and public.has_perm('users:manage')))
  with check (id = auth.uid() or public.is_super_admin()
         or (school_id = public.current_school_id() and public.has_perm('users:manage')));

-- ------------------------------------------------------------
--  NOTIFICATIONS — strictly user-owned.
-- ------------------------------------------------------------
alter table public.notifications enable row level security;
drop policy if exists notif_sel on public.notifications;
create policy notif_sel on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notif_upd on public.notifications;
create policy notif_upd on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notif_ins on public.notifications;
create policy notif_ins on public.notifications for insert to authenticated
  with check (public.in_my_school(school_id));

-- ------------------------------------------------------------
--  ANNOUNCEMENTS — everyone in the school reads; communication:send writes.
-- ------------------------------------------------------------
alter table public.announcements enable row level security;
drop policy if exists ann_sel on public.announcements;
create policy ann_sel on public.announcements for select to authenticated
  using (public.in_my_school(school_id));
drop policy if exists ann_all on public.announcements;
create policy ann_all on public.announcements for all to authenticated
  using (public.in_my_school(school_id) and public.has_perm('communication:send'))
  with check (public.in_my_school(school_id) and public.has_perm('communication:send'));

-- ------------------------------------------------------------
--  AUDIT LOGS — read with audit:read; any same-school user may append.
-- ------------------------------------------------------------
alter table public.audit_logs enable row level security;
drop policy if exists audit_sel on public.audit_logs;
create policy audit_sel on public.audit_logs for select to authenticated
  using (public.in_my_school(school_id) and public.has_perm('audit:read'));
drop policy if exists audit_ins on public.audit_logs;
create policy audit_ins on public.audit_logs for insert to authenticated
  with check (school_id is null or public.in_my_school(school_id));

-- ------------------------------------------------------------
--  CHILD tables (no school_id) — scoped via their parent.
-- ------------------------------------------------------------
-- student_guardians → via student
alter table public.student_guardians enable row level security;
drop policy if exists sg_all on public.student_guardians;
create policy sg_all on public.student_guardians for all to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and public.in_my_school(s.school_id) and public.has_perm('students:read')))
  with check (exists (select 1 from public.students s where s.id = student_id and public.in_my_school(s.school_id) and public.has_perm('students:write')));

-- curriculum_units / curriculum_lessons → via plan
alter table public.curriculum_units enable row level security;
drop policy if exists cu_all on public.curriculum_units;
create policy cu_all on public.curriculum_units for all to authenticated
  using (exists (select 1 from public.curriculum_plans p where p.id = plan_id and public.in_my_school(p.school_id) and public.has_perm('curriculum:read')))
  with check (exists (select 1 from public.curriculum_plans p where p.id = plan_id and public.in_my_school(p.school_id) and public.has_perm('curriculum:write')));

alter table public.curriculum_lessons enable row level security;
drop policy if exists cl_all on public.curriculum_lessons;
create policy cl_all on public.curriculum_lessons for all to authenticated
  using (exists (select 1 from public.curriculum_units u join public.curriculum_plans p on p.id = u.plan_id where u.id = unit_id and public.in_my_school(p.school_id) and public.has_perm('curriculum:read')))
  with check (exists (select 1 from public.curriculum_units u join public.curriculum_plans p on p.id = u.plan_id where u.id = unit_id and public.in_my_school(p.school_id) and public.has_perm('curriculum:write')));

-- observation_items → via observation
alter table public.observation_items enable row level security;
drop policy if exists oi_all on public.observation_items;
create policy oi_all on public.observation_items for all to authenticated
  using (exists (select 1 from public.observations o where o.id = observation_id and public.in_my_school(o.school_id) and public.has_perm('observations:read')))
  with check (exists (select 1 from public.observations o where o.id = observation_id and public.in_my_school(o.school_id) and public.has_perm('observations:write')));

-- activity_participants / activity_attendance → via activity (no own school_id)
alter table public.activity_participants enable row level security;
drop policy if exists ap_all on public.activity_participants;
create policy ap_all on public.activity_participants for all to authenticated
  using (exists (select 1 from public.activities a where a.id = activity_id and public.in_my_school(a.school_id) and public.has_perm('activities:read')))
  with check (exists (select 1 from public.activities a where a.id = activity_id and public.in_my_school(a.school_id) and public.has_perm('activities:write')));

alter table public.activity_attendance enable row level security;
drop policy if exists aa_all on public.activity_attendance;
create policy aa_all on public.activity_attendance for all to authenticated
  using (exists (select 1 from public.activities a where a.id = activity_id and public.in_my_school(a.school_id) and public.has_perm('activities:read')))
  with check (exists (select 1 from public.activities a where a.id = activity_id and public.in_my_school(a.school_id) and public.has_perm('activities:write')));

-- invoice_items / installments → via invoice
alter table public.invoice_items enable row level security;
drop policy if exists ii_all on public.invoice_items;
create policy ii_all on public.invoice_items for all to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and public.in_my_school(i.school_id) and public.has_perm('finance:read')))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.in_my_school(i.school_id) and public.has_perm('finance:write')));

alter table public.installments enable row level security;
drop policy if exists inst_all on public.installments;
create policy inst_all on public.installments for all to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and public.in_my_school(i.school_id) and public.has_perm('finance:read')))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.in_my_school(i.school_id) and public.has_perm('finance:write')));
