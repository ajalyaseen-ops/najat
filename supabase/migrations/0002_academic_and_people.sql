-- ============================================================
--  Madrasati ERP — 0002 · Academic structure & People
--  School → Academic Year → Stage → Grade Level → Class → Student
--  plus Departments, Subjects, Staff(Teachers), Guardians, Enrollments.
-- ============================================================

-- ---------- Academic years ----------
create table if not exists public.academic_years (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  name       text not null,              -- e.g. 2025/2026
  start_date date not null,
  end_date   date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists academic_years_current_uq
  on public.academic_years(school_id) where is_current;

-- ---------- Stages (Primary / Middle / High) ----------
create table if not exists public.school_stages (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  name_ar    text not null,
  name_en    text,
  sort_order int not null default 0
);

-- ---------- Grade levels ----------
create table if not exists public.grade_levels (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  stage_id   uuid not null references public.school_stages(id) on delete cascade,
  name_ar    text not null,
  name_en    text,
  sort_order int not null default 0
);
create index if not exists grade_levels_stage_idx on public.grade_levels(stage_id);

-- ---------- Departments ----------
create table if not exists public.departments (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  name_ar    text not null,
  name_en    text,
  head_id    uuid,                        -- → staff.id (set after staff exists)
  created_at timestamptz not null default now()
);

-- ---------- Staff / Teachers ----------
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete set null,
  employee_no text,
  civil_id    text,
  name_ar     text not null,
  name_en     text,
  department_id uuid references public.departments(id) on delete set null,
  position    text,
  qualifications text,
  experience_years int,
  email       citext,
  mobile      text,
  hire_date   date,
  status      text not null default 'active' check (status in ('active','inactive','archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists staff_school_idx on public.staff(school_id);
create index if not exists staff_dept_idx on public.staff(department_id);
create trigger trg_staff_updated before update on public.staff
  for each row execute function public.set_updated_at();

alter table public.departments
  drop constraint if exists departments_head_fk,
  add constraint departments_head_fk foreign key (head_id) references public.staff(id) on delete set null;

-- ---------- Classes ----------
create table if not exists public.classes (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  grade_level_id uuid not null references public.grade_levels(id) on delete restrict,
  name           text not null,
  capacity       int not null default 42,
  class_teacher_id uuid references public.staff(id) on delete set null,
  student_count  int not null default 0,
  status         text not null default 'active' check (status in ('active','archived')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists classes_year_idx on public.classes(academic_year_id);
create index if not exists classes_grade_idx on public.classes(grade_level_id);
create trigger trg_classes_updated before update on public.classes
  for each row execute function public.set_updated_at();

-- ---------- Subjects ----------
create table if not exists public.subjects (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  name_ar       text not null,
  name_en       text,
  code          text not null,
  weekly_periods int not null default 1,
  created_at    timestamptz not null default now()
);
create unique index if not exists subjects_code_uq on public.subjects(school_id, code);

-- ---------- Teaching assignments (teacher × subject × class) ----------
create table if not exists public.teaching_assignments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete cascade,
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  weekly_periods int not null default 0,
  unique (staff_id, subject_id, class_id, academic_year_id)
);
create index if not exists ta_class_idx on public.teaching_assignments(class_id);
create index if not exists ta_staff_idx on public.teaching_assignments(staff_id);

-- ---------- Students ----------
create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  student_no    text,
  ministry_no   text,
  civil_id      text,
  name_ar       text not null,
  name_en       text,
  gender        text not null default 'male' check (gender in ('male','female')),
  dob           date,
  nationality   text,
  religion      text,
  address       text,
  medical_notes text,
  enrollment_date date,
  status        text not null default 'enrolled'
                check (status in ('enrolled','transferred','withdrawn','graduated','archived')),
  emergency_contact text,
  father_name   text,
  mother_name   text,
  guardian_name text,
  guardian_mobile text,
  guardian_email  citext,
  guardian_occupation text,
  current_class_id uuid references public.classes(id) on delete set null,
  photo_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists students_school_idx on public.students(school_id);
create index if not exists students_class_idx on public.students(current_class_id);
create index if not exists students_status_idx on public.students(status);
create unique index if not exists students_ministry_uq
  on public.students(school_id, ministry_no) where ministry_no is not null;
create trigger trg_students_updated before update on public.students
  for each row execute function public.set_updated_at();

-- ---------- Guardians (parent portal accounts) ----------
create table if not exists public.guardians (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name       text not null,
  mobile     text,
  email      citext,
  occupation text,
  created_at timestamptz not null default now()
);
create table if not exists public.student_guardians (
  student_id  uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  relation    text,                        -- father / mother / guardian
  is_primary  boolean not null default false,
  primary key (student_id, guardian_id)
);

-- ---------- Enrollment history (promotions / transfers) ----------
create table if not exists public.student_enrollments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  class_id    uuid references public.classes(id) on delete set null,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  status      text not null default 'enrolled',
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists enroll_student_idx on public.student_enrollments(student_id);

-- ------------------------------------------------------------
--  Maintain classes.student_count automatically
-- ------------------------------------------------------------
create or replace function public.refresh_class_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT','UPDATE') and new.current_class_id is not null then
    update public.classes c set student_count = (
      select count(*) from public.students s
      where s.current_class_id = c.id and s.status = 'enrolled'
    ) where c.id = new.current_class_id;
  end if;
  if tg_op in ('UPDATE','DELETE') and coalesce(old.current_class_id, '00000000-0000-0000-0000-000000000000'::uuid)
       is distinct from coalesce(new.current_class_id, old.current_class_id) and old.current_class_id is not null then
    update public.classes c set student_count = (
      select count(*) from public.students s
      where s.current_class_id = c.id and s.status = 'enrolled'
    ) where c.id = old.current_class_id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_student_class_count on public.students;
create trigger trg_student_class_count
  after insert or update of current_class_id, status or delete on public.students
  for each row execute function public.refresh_class_count();
