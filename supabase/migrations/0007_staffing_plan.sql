-- ============================================================
--  Madrasati ERP — Staffing Plan (خطة النصاب / ميزانية المدرسين والفصول)
--  Run AFTER 0001–0006.
--
--  Adds the data model behind the per-department staffing sheet:
--    • staff: نصاب (target load), exempt (non-teaching) periods, role tags
--    • departments: required weekly periods per class for the dept's subject
--    • staffing_allocations: how many periods each teacher gives each class
--
--  The sheet reproduces the school's «مقترح الخطة المستهدفة لميزانية
--  المدرسين والفصول»: one department per sheet, teachers down the rows,
--  the 32 classes (4 grades × 8) across the columns, periods in each cell.
-- ============================================================

-- ---------- Staff: teaching load + duties + role tags ----------
alter table public.staff
  add column if not exists nisab          smallint not null default 18,
  add column if not exists exempt_periods smallint not null default 0,
  add column if not exists role_tags      text[]   not null default '{}';

comment on column public.staff.nisab is 'النصاب — target weekly teaching load (periods).';
comment on column public.staff.exempt_periods is 'Non-teaching periods credited toward the load (إشراف/إدارة/دراسات).';
comment on column public.staff.role_tags is 'Plan role tags: head, wing_supervisor, subject_supervisor, school_assigned, studies, tech_coordinator, full_time, ...';

-- ---------- Departments: required periods per class ----------
alter table public.departments
  add column if not exists periods_per_class smallint not null default 0;

comment on column public.departments.periods_per_class is 'Weekly periods each class needs for this department''s subject (e.g. Arabic 6, Science 4).';

-- ---------- Staffing allocations (teacher × class × periods) ----------
create table if not exists public.staffing_allocations (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  department_id    uuid not null references public.departments(id) on delete cascade,
  staff_id         uuid not null references public.staff(id) on delete cascade,
  class_id         uuid not null references public.classes(id) on delete cascade,
  periods          smallint not null default 0 check (periods >= 0 and periods <= 40),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (academic_year_id, department_id, staff_id, class_id)
);
create index if not exists staffing_alloc_dept_year_idx
  on public.staffing_allocations(department_id, academic_year_id);
create index if not exists staffing_alloc_staff_idx
  on public.staffing_allocations(staff_id);
create index if not exists staffing_alloc_class_idx
  on public.staffing_allocations(class_id);
create trigger trg_staffing_alloc_updated before update on public.staffing_allocations
  for each row execute function public.set_updated_at();

-- ---------- Permissions ----------
insert into public.permissions (key) values
  ('staffing:read'), ('staffing:write')
on conflict (key) do nothing;

-- Grant: principal & vice_principal (read+write), department_head (read).
insert into public.role_permissions (role_key, permission_key) values
  ('principal','staffing:read'),
  ('principal','staffing:write'),
  ('vice_principal','staffing:read'),
  ('vice_principal','staffing:write'),
  ('department_head','staffing:read')
on conflict do nothing;

-- ---------- RLS ----------
alter table public.staffing_allocations enable row level security;

drop policy if exists staffing_alloc_sel on public.staffing_allocations;
create policy staffing_alloc_sel on public.staffing_allocations
  for select to authenticated
  using (public.in_my_school(school_id) and public.has_perm('staffing:read'));

drop policy if exists staffing_alloc_ins on public.staffing_allocations;
create policy staffing_alloc_ins on public.staffing_allocations
  for insert to authenticated
  with check (public.in_my_school(school_id) and public.has_perm('staffing:write'));

drop policy if exists staffing_alloc_upd on public.staffing_allocations;
create policy staffing_alloc_upd on public.staffing_allocations
  for update to authenticated
  using (public.in_my_school(school_id) and public.has_perm('staffing:write'))
  with check (public.in_my_school(school_id) and public.has_perm('staffing:write'));

drop policy if exists staffing_alloc_del on public.staffing_allocations;
create policy staffing_alloc_del on public.staffing_allocations
  for delete to authenticated
  using (public.in_my_school(school_id) and public.has_perm('staffing:write'));

-- super_admin already has full access via the '*' wildcard in has_perm().
