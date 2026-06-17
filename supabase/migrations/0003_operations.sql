-- ============================================================
--  Madrasati ERP — 0003 · Daily operations
--  Attendance · Assessments/Grades · Islamic Studies · Curriculum
--  Coverage · Behavior · Timetable · Activities · Observations
-- ============================================================

-- ---------- Attendance ----------
create table if not exists public.attendance_records (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  date        date not null,
  status      text not null check (status in ('present','absent','excused','late','medical')),
  note        text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (student_id, date)
);
create index if not exists att_class_date_idx on public.attendance_records(class_id, date);
create index if not exists att_school_date_idx on public.attendance_records(school_id, date);

-- ---------- Grade scale (GPA mapping) ----------
create table if not exists public.grade_scales (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  min_pct   numeric(5,2) not null,
  max_pct   numeric(5,2) not null,
  letter    text not null,
  gpa       numeric(3,2) not null,
  label_ar  text
);

-- ---------- Assessment types (weights) ----------
create table if not exists public.assessment_types (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name_ar   text not null,
  name_en   text,
  weight    numeric(5,2) not null default 0,   -- contribution to subject total
  max_score numeric(6,2) not null default 100,
  sort_order int not null default 0
);

-- ---------- Assessments (a graded item for a class/subject) ----------
create table if not exists public.assessments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  assessment_type_id uuid references public.assessment_types(id) on delete set null,
  term        int not null default 1,
  title       text not null,
  max_score   numeric(6,2) not null default 100,
  date        date,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists assess_class_subject_idx on public.assessments(class_id, subject_id);

-- ---------- Grades (a student's score on an assessment) ----------
create table if not exists public.grades (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  score         numeric(6,2),
  note          text,
  updated_at    timestamptz not null default now(),
  unique (assessment_id, student_id)
);
create index if not exists grades_student_idx on public.grades(student_id);
create trigger trg_grades_updated before update on public.grades
  for each row execute function public.set_updated_at();

-- ---------- Report cards (generated snapshots) ----------
create table if not exists public.report_cards (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  term        int not null,
  gpa         numeric(3,2),
  average     numeric(5,2),
  rank        int,
  comment     text,
  data        jsonb,                 -- frozen per-subject breakdown
  issued_at   timestamptz not null default now()
);

-- ============================================================
--  ISLAMIC STUDIES
-- ============================================================
create table if not exists public.quran_surahs (
  number   int primary key,           -- 1..114
  name_ar  text not null,
  ayah_count int not null
);

create table if not exists public.quran_memorization (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  surah_number int not null references public.quran_surahs(number),
  from_ayah   int,
  to_ayah     int,
  status      text not null default 'in_progress'
              check (status in ('not_started','in_progress','memorized')),
  score       numeric(5,2),
  tajweed_score numeric(5,2),
  assessed_by uuid references public.profiles(id) on delete set null,
  assessed_at date,
  created_at  timestamptz not null default now()
);
create index if not exists quran_student_idx on public.quran_memorization(student_id);

create table if not exists public.quran_revisions (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  surah_number int references public.quran_surahs(number),
  date        date not null,
  quality     text check (quality in ('excellent','good','fair','weak')),
  note        text
);

-- ============================================================
--  CURRICULUM COVERAGE
-- ============================================================
create table if not exists public.curriculum_plans (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  grade_level_id uuid references public.grade_levels(id) on delete set null,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  title       text not null
);
create table if not exists public.curriculum_units (
  id        uuid primary key default gen_random_uuid(),
  plan_id   uuid not null references public.curriculum_plans(id) on delete cascade,
  title     text not null,
  sort_order int not null default 0
);
create table if not exists public.curriculum_lessons (
  id        uuid primary key default gen_random_uuid(),
  unit_id   uuid not null references public.curriculum_units(id) on delete cascade,
  title     text not null,
  outcomes  text,
  planned_date date,
  sort_order int not null default 0
);
create table if not exists public.curriculum_coverage (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  lesson_id   uuid not null references public.curriculum_lessons(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  status      text not null default 'not_started'
              check (status in ('not_started','in_progress','completed')),
  covered_on  date,
  recorded_by uuid references public.profiles(id) on delete set null,
  unique (lesson_id, class_id)
);

-- ============================================================
--  BEHAVIOR & DISCIPLINE
-- ============================================================
create table if not exists public.behavior_records (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  kind        text not null check (kind in ('positive','negative')),
  category    text not null,         -- award/leadership | warning/misconduct/suspension
  description text,
  action_taken text,
  points      int default 0,
  recorded_by uuid references public.profiles(id) on delete set null,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists behavior_student_idx on public.behavior_records(student_id);

-- ============================================================
--  TIMETABLE
-- ============================================================
create table if not exists public.rooms (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name      text not null,
  capacity  int
);
create table if not exists public.periods (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  label     text not null,
  start_time time not null,
  end_time   time not null,
  sort_order int not null default 0
);
create table if not exists public.timetable_slots (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete set null,
  staff_id    uuid references public.staff(id) on delete set null,
  room_id     uuid references public.rooms(id) on delete set null,
  period_id   uuid not null references public.periods(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),  -- 0 = Sunday
  unique (class_id, period_id, day_of_week)
);
-- Conflict guard: a teacher can't be in two places at once.
create unique index if not exists timetable_teacher_uq
  on public.timetable_slots(staff_id, period_id, day_of_week) where staff_id is not null;

-- ============================================================
--  ACTIVITIES & SUMMER CLUBS
-- ============================================================
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  name        text not null,
  kind        text,                  -- summer_club | camp | competition | sport | trip
  description text,
  supervisor_id uuid references public.staff(id) on delete set null,
  start_date  date,
  end_date    date,
  fee         numeric(10,2) default 0,
  capacity    int,
  created_at  timestamptz not null default now()
);
create table if not exists public.activity_participants (
  activity_id uuid not null references public.activities(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  fee_paid    boolean not null default false,
  primary key (activity_id, student_id)
);
create table if not exists public.activity_attendance (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  date        date not null,
  present     boolean not null default true
);

-- ============================================================
--  OBSERVATIONS & SUPERVISION
-- ============================================================
create table if not exists public.observations (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete cascade,   -- observed teacher
  observer_id uuid references public.profiles(id) on delete set null,
  class_id    uuid references public.classes(id) on delete set null,
  subject_id  uuid references public.subjects(id) on delete set null,
  date        date not null default current_date,
  overall_score numeric(5,2),
  strengths   text,
  improvements text,
  development_plan text,
  status      text not null default 'draft' check (status in ('draft','submitted','acknowledged')),
  created_at  timestamptz not null default now()
);
create table if not exists public.observation_items (
  id            uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.observations(id) on delete cascade,
  criterion     text not null,
  score         numeric(5,2),
  note          text
);
