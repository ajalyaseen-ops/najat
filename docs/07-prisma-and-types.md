# 07 · Schema as Code — SQL Migrations, TypeScript Types & Optional Prisma Layer

> **Scope:** how Madrasati manages its database schema, keeps TypeScript in sync,
> and optionally layers Prisma on top for teams that want a typed query builder.
> Covers the canonical migration workflow, the `npm run db:types` pipeline,
> a complete equivalent `schema.prisma`, and an honest trade-off table.

---

## 1. The Canonical Approach: SQL Migrations are the Source of Truth

Madrasati uses **Supabase** as its database runtime. Supabase wraps Postgres and
adds Auth, Storage, RLS policies, and server-side helpers. Because of these
Supabase-specific features — `auth.uid()`, `SECURITY DEFINER` functions, RLS
policies, generated-always identity columns, `citext` extension, partial unique
indexes — **raw SQL is the only format that can express the full schema**.

No ORM-generated migration can produce the equivalent of:

```sql
-- from 0001_core_and_rbac.sql
create or replace function public.has_perm(perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.role_permissions rp
    join public.profiles p on p.id = auth.uid()
    where rp.role_key = p.role
      and (rp.permission_key = perm or rp.permission_key = '*')
  );
$$;

-- used in 0005_rls_policies.sql
create policy students_sel on public.students for select to authenticated
  using (public.in_my_school(school_id) and public.has_perm('students:read'));
```

### Migration files (apply in order)

| File | Contents |
|---|---|
| `supabase/migrations/0001_core_and_rbac.sql` | `schools`, `roles`, `permissions`, `role_permissions`, `profiles`; RBAC helper functions (`current_school_id`, `has_perm`, `in_my_school`, `is_super_admin`); auto-profile trigger |
| `supabase/migrations/0002_academic_and_people.sql` | `academic_years`, `school_stages`, `grade_levels`, `departments`, `staff`, `classes`, `subjects`, `teaching_assignments`, `students`, `guardians`, `student_guardians`, `student_enrollments`; `refresh_class_count` trigger |
| `supabase/migrations/0003_operations.sql` | `attendance_records`, `grade_scales`, `assessment_types`, `assessments`, `grades`, `report_cards`, `quran_surahs`, `quran_memorization`, `quran_revisions`, `curriculum_plans/units/lessons/coverage`, `behavior_records`, `rooms`, `periods`, `timetable_slots`, `activities`, `activity_participants/attendance`, `observations`, `observation_items` |
| `supabase/migrations/0004_admin_finance_audit.sql` | `report_templates`, `announcements`, `notifications`, `message_log`, `fee_structures`, `invoices`, `invoice_items`, `installments`, `payments`, `audit_logs` |
| `supabase/migrations/0005_rls_policies.sql` | All RLS `enable row level security` + policy `CREATE POLICY` statements for every table |

Apply via the Supabase SQL Editor or the CLI:

```bash
supabase db push           # linked project (remote)
supabase db reset          # local docker stack — applies all migrations fresh
```

---

## 2. TypeScript Types: `database.types.ts`

The project keeps typed DB access through `@supabase/supabase-js`'s generic
`createServerClient<Database>(…)`. The `Database` interface lives in
`src/lib/database.types.ts` and is passed through the Supabase client factory
at `src/lib/supabase/server.ts`:

```ts
// src/lib/supabase/server.ts
import type { Database } from "@/lib/database.types";

return createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { … } }
);
```

This means every `.from("students")` call is fully typed: column names, insert
shapes, update shapes, and relationships are all inferred.

### 2.1 Hand-authored bootstrap vs. generated types

`src/lib/database.types.ts` currently contains a **hand-authored subset** of the
schema. The file's own header explains the intent:

```ts
/**
 * Database types — hand-authored for the core tables used by the foundation
 * app so the project type-checks out of the box. After you apply the SQL
 * migrations to your Supabase project, REGENERATE the full, authoritative
 * types with:   npm run db:types
 */
```

The hand-authored file is safe to commit to get the project compiling without a
live Supabase project. Once migrations are applied to a real project, replace it
with the generated version.

### 2.2 Regenerating types

```bash
npm run db:types
# expands to:
# supabase gen types typescript --linked > src/lib/database.types.ts
```

The `--linked` flag targets whichever project is linked via `supabase link`. Run
this command:

- After every new migration
- When a column is added/renamed/dropped on the remote project
- Before submitting a PR that adds new `.from("…")` calls

The generated file is large (one interface per table × Row / Insert / Update
shapes) but should be **committed** to the repo so CI type-checking
(`npm run typecheck`) works without a live DB connection.

> **Tip:** if you use Supabase branching (preview environments), run
> `supabase gen types typescript --project-id $SUPABASE_PROJECT_ID` and target
> your branch's project ID in CI.

---

## 3. Schema Overview (Entity Relationship)

```mermaid
erDiagram
    schools ||--o{ profiles : "school_id"
    schools ||--o{ academic_years : "school_id"
    schools ||--o{ school_stages : "school_id"
    school_stages ||--o{ grade_levels : "stage_id"
    schools ||--o{ departments : "school_id"
    schools ||--o{ staff : "school_id"
    departments ||--o{ staff : "department_id"
    schools ||--o{ classes : "school_id"
    academic_years ||--o{ classes : "academic_year_id"
    grade_levels ||--o{ classes : "grade_level_id"
    schools ||--o{ students : "school_id"
    classes ||--o{ students : "current_class_id"
    students ||--o{ student_guardians : "student_id"
    guardians ||--o{ student_guardians : "guardian_id"
    students ||--o{ student_enrollments : "student_id"
    classes ||--o{ student_enrollments : "class_id"
    staff ||--o{ teaching_assignments : "staff_id"
    subjects ||--o{ teaching_assignments : "subject_id"
    classes ||--o{ teaching_assignments : "class_id"
    students ||--o{ attendance_records : "student_id"
    classes ||--o{ assessments : "class_id"
    subjects ||--o{ assessments : "subject_id"
    assessments ||--o{ grades : "assessment_id"
    students ||--o{ grades : "student_id"
    students ||--o{ quran_memorization : "student_id"
    quran_surahs ||--o{ quran_memorization : "surah_number"
    curriculum_plans ||--o{ curriculum_units : "plan_id"
    curriculum_units ||--o{ curriculum_lessons : "unit_id"
    curriculum_lessons ||--o{ curriculum_coverage : "lesson_id"
    students ||--o{ behavior_records : "student_id"
    classes ||--o{ timetable_slots : "class_id"
    periods ||--o{ timetable_slots : "period_id"
    activities ||--o{ activity_participants : "activity_id"
    students ||--o{ activity_participants : "student_id"
    staff ||--o{ observations : "staff_id"
    invoices ||--o{ invoice_items : "invoice_id"
    invoices ||--o{ installments : "invoice_id"
    invoices ||--o{ payments : "invoice_id"
```

---

## 4. Optional Prisma Layer

Prisma is **not** part of the default Madrasati stack. The project talks to
Supabase exclusively through the `@supabase/supabase-js` client, which goes
through PostgREST and therefore respects RLS automatically.

That said, some teams prefer Prisma for:

- Complex join queries that PostgREST makes verbose
- Type-safe raw SQL with `$queryRaw`/`$executeRaw` while keeping model types
- Prisma Studio as a local database browser during development
- Generating seed scripts with `prisma db seed`

If your team chooses to add Prisma, install it **alongside** the existing
`@supabase/supabase-js` setup — do **not** replace the Supabase client, since
Prisma bypasses RLS.

```bash
npm install prisma @prisma/client --save-dev
npx prisma init --datasource-provider postgresql
```

### 4.1 Connection string

Prisma must use the **direct** (non-pooler) connection, not the Supabase pooler
URL, because Prisma manages its own connection pool:

```env
# .env.local  — NEVER commit
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

The project ref is visible in the Supabase dashboard → Settings → Database.

> **Security note:** `DATABASE_URL` carries `postgres` (superuser) credentials.
> It **bypasses RLS completely**. Never expose this on the client side. Use only
> in Server Actions, API routes, or CLI scripts running in a trusted server
> environment.

### 4.2 Equivalent `schema.prisma`

The schema below maps every table from migrations `0001`–`0004`. It is kept in
sync with the SQL manually; the SQL remains canonical.

```prisma
// prisma/schema.prisma
// ---------------------------------------------------------------
//  Madrasati ERP — Prisma schema (OPTIONAL typed query layer).
//  The SQL migrations in supabase/migrations/ are the source of
//  truth. This file mirrors them for Prisma Client generation.
//  DO NOT run `prisma migrate` against a Supabase project —
//  use the SQL files instead.
// ---------------------------------------------------------------

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
//  CORE & RBAC  (0001_core_and_rbac.sql)
// ============================================================

model School {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  nameAr              String   @map("name_ar")
  nameEn              String?  @map("name_en")
  slug                String   @unique
  logoUrl             String?  @map("logo_url")
  secondaryLogoUrl    String?  @map("secondary_logo_url")
  stampUrl            String?  @map("stamp_url")
  signatureUrl        String?  @map("signature_url")
  loginBgUrl          String?  @map("login_bg_url")
  bannerUrl           String?  @map("banner_url")
  sloganAr            String?  @map("slogan_ar")
  sloganEn            String?  @map("slogan_en")
  address             String?
  phone               String?
  email               String?
  website             String?
  principalName       String?  @map("principal_name")
  theme               Json?
  calendar            String   @default("gregorian")
  isActive            Boolean  @default(true) @map("is_active")
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt           DateTime @updatedAt @map("updated_at") @db.Timestamptz

  profiles            Profile[]
  academicYears       AcademicYear[]
  stages              SchoolStage[]
  departments         Department[]
  staff               Staff[]
  classes             Class[]
  subjects            Subject[]
  students            Student[]
  guardians           Guardian[]
  studentEnrollments  StudentEnrollment[]
  attendanceRecords   AttendanceRecord[]
  gradeScales         GradeScale[]
  assessmentTypes     AssessmentType[]
  assessments         Assessment[]
  grades              Grade[]
  reportCards         ReportCard[]
  quranMemorization   QuranMemorization[]
  quranRevisions      QuranRevision[]
  curriculumPlans     CurriculumPlan[]
  curriculumCoverage  CurriculumCoverage[]
  behaviorRecords     BehaviorRecord[]
  rooms               Room[]
  periods             Period[]
  timetableSlots      TimetableSlot[]
  activities          Activity[]
  observations        Observation[]
  reportTemplates     ReportTemplate[]
  announcements       Announcement[]
  notifications       Notification[]
  messageLogs         MessageLog[]
  feeStructures       FeeStructure[]
  invoices            Invoice[]
  payments            Payment[]
  auditLogs           AuditLog[]

  @@map("schools")
}

model Role {
  key             String           @id
  nameAr          String           @map("name_ar")
  nameEn          String           @map("name_en")
  isSystem        Boolean          @default(true) @map("is_system")
  rolePermissions RolePermission[]
  profiles        Profile[]

  @@map("roles")
}

model Permission {
  key             String           @id
  description     String?
  rolePermissions RolePermission[]

  @@map("permissions")
}

model RolePermission {
  roleKey       String @map("role_key")
  permissionKey String @map("permission_key")
  role          Role       @relation(fields: [roleKey], references: [key], onDelete: Cascade)
  permission    Permission @relation(fields: [permissionKey], references: [key], onDelete: Cascade)

  @@id([roleKey, permissionKey])
  @@map("role_permissions")
}

model Profile {
  id                 String   @id @db.Uuid
  schoolId           String?  @map("school_id") @db.Uuid
  email              String?
  fullName           String?  @map("full_name")
  role               String   @default("teacher")
  avatarUrl          String?  @map("avatar_url")
  mustChangePassword Boolean  @default(false) @map("must_change_password")
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime @updatedAt @map("updated_at") @db.Timestamptz

  school             School?  @relation(fields: [schoolId], references: [id], onDelete: SetNull)
  roleRef            Role     @relation(fields: [role], references: [key])

  attendanceRecords  AttendanceRecord[]
  assessmentsCreated Assessment[]
  gradesUpdated      Grade[]
  quranAssessments   QuranMemorization[]
  curriculumCoverage CurriculumCoverage[]
  behaviorRecords    BehaviorRecord[]
  observations       Observation[]
  notifications      Notification[]
  announcements      Announcement[]
  paymentsReceived   Payment[]
  auditLogs          AuditLog[]

  @@map("profiles")
}

// ============================================================
//  ACADEMIC STRUCTURE  (0002_academic_and_people.sql)
// ============================================================

model AcademicYear {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId  String   @map("school_id") @db.Uuid
  name      String
  startDate DateTime @map("start_date") @db.Date
  endDate   DateTime @map("end_date") @db.Date
  isCurrent Boolean  @default(false) @map("is_current")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  school              School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  classes             Class[]
  studentEnrollments  StudentEnrollment[]
  teachingAssignments TeachingAssignment[]
  curriculumPlans     CurriculumPlan[]
  feeStructures       FeeStructure[]
  invoices            Invoice[]
  reportCards         ReportCard[]

  @@map("academic_years")
}

model SchoolStage {
  id          String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId    String       @map("school_id") @db.Uuid
  nameAr      String       @map("name_ar")
  nameEn      String?      @map("name_en")
  sortOrder   Int          @default(0) @map("sort_order")
  school      School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  gradeLevels GradeLevel[]

  @@map("school_stages")
}

model GradeLevel {
  id          String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId    String       @map("school_id") @db.Uuid
  stageId     String       @map("stage_id") @db.Uuid
  nameAr      String       @map("name_ar")
  nameEn      String?      @map("name_en")
  sortOrder   Int          @default(0) @map("sort_order")
  school      School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  stage       SchoolStage  @relation(fields: [stageId], references: [id], onDelete: Cascade)
  classes     Class[]
  feeStructures FeeStructure[]
  curriculumPlans CurriculumPlan[]

  @@map("grade_levels")
}

model Department {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId  String   @map("school_id") @db.Uuid
  nameAr    String   @map("name_ar")
  nameEn    String?  @map("name_en")
  headId    String?  @map("head_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  head      Staff?   @relation("DepartmentHead", fields: [headId], references: [id], onDelete: SetNull)
  staff     Staff[]  @relation("StaffDepartment")
  subjects  Subject[]

  @@map("departments")
}

model Staff {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId           String   @map("school_id") @db.Uuid
  profileId          String?  @map("profile_id") @db.Uuid
  employeeNo         String?  @map("employee_no")
  civilId            String?  @map("civil_id")
  nameAr             String   @map("name_ar")
  nameEn             String?  @map("name_en")
  departmentId       String?  @map("department_id") @db.Uuid
  position           String?
  qualifications     String?
  experienceYears    Int?     @map("experience_years")
  email              String?
  mobile             String?
  hireDate           DateTime? @map("hire_date") @db.Date
  status             String   @default("active")
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime @updatedAt @map("updated_at") @db.Timestamptz

  school              School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  department          Department?          @relation("StaffDepartment", fields: [departmentId], references: [id], onDelete: SetNull)
  headOfDepartments   Department[]         @relation("DepartmentHead")
  classesAsTeacher    Class[]
  teachingAssignments TeachingAssignment[]
  timetableSlots      TimetableSlot[]
  supervisedActivities Activity[]
  observations        Observation[]

  @@map("staff")
}

model Class {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId        String   @map("school_id") @db.Uuid
  academicYearId  String   @map("academic_year_id") @db.Uuid
  gradeLevelId    String   @map("grade_level_id") @db.Uuid
  name            String
  capacity        Int      @default(42)
  classTeacherId  String?  @map("class_teacher_id") @db.Uuid
  studentCount    Int      @default(0) @map("student_count")
  status          String   @default("active")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz

  school              School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  academicYear        AcademicYear         @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  gradeLevel          GradeLevel           @relation(fields: [gradeLevelId], references: [id])
  classTeacher        Staff?               @relation(fields: [classTeacherId], references: [id], onDelete: SetNull)
  students            Student[]
  studentEnrollments  StudentEnrollment[]
  teachingAssignments TeachingAssignment[]
  attendanceRecords   AttendanceRecord[]
  assessments         Assessment[]
  curriculumCoverage  CurriculumCoverage[]
  timetableSlots      TimetableSlot[]
  observations        Observation[]

  @@map("classes")
}

model Subject {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId      String    @map("school_id") @db.Uuid
  departmentId  String?   @map("department_id") @db.Uuid
  nameAr        String    @map("name_ar")
  nameEn        String?   @map("name_en")
  code          String
  weeklyPeriods Int       @default(1) @map("weekly_periods")
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz

  school              School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  department          Department?          @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  teachingAssignments TeachingAssignment[]
  assessments         Assessment[]
  timetableSlots      TimetableSlot[]
  curriculumPlans     CurriculumPlan[]
  observations        Observation[]

  @@map("subjects")
}

model TeachingAssignment {
  id             String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId       String @map("school_id") @db.Uuid
  staffId        String @map("staff_id") @db.Uuid
  subjectId      String @map("subject_id") @db.Uuid
  classId        String @map("class_id") @db.Uuid
  academicYearId String @map("academic_year_id") @db.Uuid
  weeklyPeriods  Int    @default(0) @map("weekly_periods")

  school       School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  staff        Staff        @relation(fields: [staffId], references: [id], onDelete: Cascade)
  subject      Subject      @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  class        Class        @relation(fields: [classId], references: [id], onDelete: Cascade)
  academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

  @@unique([staffId, subjectId, classId, academicYearId])
  @@map("teaching_assignments")
}

model Student {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId          String    @map("school_id") @db.Uuid
  studentNo         String?   @map("student_no")
  ministryNo        String?   @map("ministry_no")
  civilId           String?   @map("civil_id")
  nameAr            String    @map("name_ar")
  nameEn            String?   @map("name_en")
  gender            String    @default("male")
  dob               DateTime? @db.Date
  nationality       String?
  religion          String?
  address           String?
  medicalNotes      String?   @map("medical_notes")
  enrollmentDate    DateTime? @map("enrollment_date") @db.Date
  status            String    @default("enrolled")
  emergencyContact  String?   @map("emergency_contact")
  fatherName        String?   @map("father_name")
  motherName        String?   @map("mother_name")
  guardianName      String?   @map("guardian_name")
  guardianMobile    String?   @map("guardian_mobile")
  guardianEmail     String?   @map("guardian_email")
  guardianOccupation String?  @map("guardian_occupation")
  currentClassId    String?   @map("current_class_id") @db.Uuid
  photoUrl          String?   @map("photo_url")
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  school             School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  currentClass       Class?               @relation(fields: [currentClassId], references: [id], onDelete: SetNull)
  guardians          StudentGuardian[]
  enrollments        StudentEnrollment[]
  attendanceRecords  AttendanceRecord[]
  grades             Grade[]
  reportCards        ReportCard[]
  quranMemorization  QuranMemorization[]
  quranRevisions     QuranRevision[]
  behaviorRecords    BehaviorRecord[]
  activityParticipants ActivityParticipant[]
  activityAttendance ActivityAttendance[]
  invoices           Invoice[]

  @@map("students")
}

model Guardian {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId  String   @map("school_id") @db.Uuid
  profileId String?  @map("profile_id") @db.Uuid
  name      String
  mobile    String?
  email     String?
  occupation String?
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  school   School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  students StudentGuardian[]

  @@map("guardians")
}

model StudentGuardian {
  studentId  String  @map("student_id") @db.Uuid
  guardianId String  @map("guardian_id") @db.Uuid
  relation   String?
  isPrimary  Boolean @default(false) @map("is_primary")

  student  Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  guardian Guardian @relation(fields: [guardianId], references: [id], onDelete: Cascade)

  @@id([studentId, guardianId])
  @@map("student_guardians")
}

model StudentEnrollment {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId       String   @map("school_id") @db.Uuid
  studentId      String   @map("student_id") @db.Uuid
  classId        String?  @map("class_id") @db.Uuid
  academicYearId String   @map("academic_year_id") @db.Uuid
  status         String   @default("enrolled")
  note           String?
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz

  school       School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  student      Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  class        Class?       @relation(fields: [classId], references: [id], onDelete: SetNull)
  academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

  @@map("student_enrollments")
}

// ============================================================
//  OPERATIONS  (0003_operations.sql)
// ============================================================

model AttendanceRecord {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId   String   @map("school_id") @db.Uuid
  studentId  String   @map("student_id") @db.Uuid
  classId    String   @map("class_id") @db.Uuid
  date       DateTime @db.Date
  status     String   // present | absent | excused | late | medical
  note       String?
  recordedBy String?  @map("recorded_by") @db.Uuid
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  class     Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  recorder  Profile? @relation(fields: [recordedBy], references: [id], onDelete: SetNull)

  @@unique([studentId, date])
  @@map("attendance_records")
}

model GradeScale {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId  String  @map("school_id") @db.Uuid
  minPct    Decimal @map("min_pct") @db.Decimal(5, 2)
  maxPct    Decimal @map("max_pct") @db.Decimal(5, 2)
  letter    String
  gpa       Decimal @db.Decimal(3, 2)
  labelAr   String? @map("label_ar")

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@map("grade_scales")
}

model AssessmentType {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId   String   @map("school_id") @db.Uuid
  nameAr     String   @map("name_ar")
  nameEn     String?  @map("name_en")
  weight     Decimal  @default(0) @db.Decimal(5, 2)
  maxScore   Decimal  @default(100) @map("max_score") @db.Decimal(6, 2)
  sortOrder  Int      @default(0) @map("sort_order")

  school      School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  assessments Assessment[]

  @@map("assessment_types")
}

model Assessment {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId         String    @map("school_id") @db.Uuid
  classId          String    @map("class_id") @db.Uuid
  subjectId        String    @map("subject_id") @db.Uuid
  assessmentTypeId String?   @map("assessment_type_id") @db.Uuid
  term             Int       @default(1)
  title            String
  maxScore         Decimal   @default(100) @map("max_score") @db.Decimal(6, 2)
  date             DateTime? @db.Date
  createdBy        String?   @map("created_by") @db.Uuid
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz

  school         School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  class          Class           @relation(fields: [classId], references: [id], onDelete: Cascade)
  subject        Subject         @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  assessmentType AssessmentType? @relation(fields: [assessmentTypeId], references: [id], onDelete: SetNull)
  creator        Profile?        @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  grades         Grade[]

  @@map("assessments")
}

model Grade {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId     String    @map("school_id") @db.Uuid
  assessmentId String    @map("assessment_id") @db.Uuid
  studentId    String    @map("student_id") @db.Uuid
  score        Decimal?  @db.Decimal(6, 2)
  note         String?
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  school     School     @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  assessment Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  student    Student    @relation(fields: [studentId], references: [id], onDelete: Cascade)
  updater    Profile?   @relation(fields: [schoolId], references: [id]) // soft link

  @@unique([assessmentId, studentId])
  @@map("grades")
}

model ReportCard {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId       String    @map("school_id") @db.Uuid
  studentId      String    @map("student_id") @db.Uuid
  academicYearId String    @map("academic_year_id") @db.Uuid
  term           Int
  gpa            Decimal?  @db.Decimal(3, 2)
  average        Decimal?  @db.Decimal(5, 2)
  rank           Int?
  comment        String?
  data           Json?     // frozen per-subject breakdown
  issuedAt       DateTime  @default(now()) @map("issued_at") @db.Timestamptz

  school       School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  student      Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

  @@map("report_cards")
}

model QuranSurah {
  number     Int    @id
  nameAr     String @map("name_ar")
  ayahCount  Int    @map("ayah_count")

  memorizations QuranMemorization[]
  revisions     QuranRevision[]

  @@map("quran_surahs")
}

model QuranMemorization {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId     String    @map("school_id") @db.Uuid
  studentId    String    @map("student_id") @db.Uuid
  surahNumber  Int       @map("surah_number")
  fromAyah     Int?      @map("from_ayah")
  toAyah       Int?      @map("to_ayah")
  status       String    @default("in_progress")
  score        Decimal?  @db.Decimal(5, 2)
  tajweedScore Decimal?  @map("tajweed_score") @db.Decimal(5, 2)
  assessedBy   String?   @map("assessed_by") @db.Uuid
  assessedAt   DateTime? @map("assessed_at") @db.Date
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz

  school   School     @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  student  Student    @relation(fields: [studentId], references: [id], onDelete: Cascade)
  surah    QuranSurah @relation(fields: [surahNumber], references: [number])
  assessor Profile?   @relation(fields: [assessedBy], references: [id], onDelete: SetNull)

  @@map("quran_memorization")
}

model QuranRevision {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId    String    @map("school_id") @db.Uuid
  studentId   String    @map("student_id") @db.Uuid
  surahNumber Int?      @map("surah_number")
  date        DateTime  @db.Date
  quality     String?   // excellent | good | fair | weak
  note        String?

  school  School      @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  student Student     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  surah   QuranSurah? @relation(fields: [surahNumber], references: [number])

  @@map("quran_revisions")
}

model CurriculumPlan {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId       String    @map("school_id") @db.Uuid
  subjectId      String    @map("subject_id") @db.Uuid
  gradeLevelId   String?   @map("grade_level_id") @db.Uuid
  academicYearId String?   @map("academic_year_id") @db.Uuid
  title          String

  school       School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  subject      Subject       @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  gradeLevel   GradeLevel?   @relation(fields: [gradeLevelId], references: [id], onDelete: SetNull)
  academicYear AcademicYear? @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  units        CurriculumUnit[]

  @@map("curriculum_plans")
}

model CurriculumUnit {
  id        String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  planId    String @map("plan_id") @db.Uuid
  title     String
  sortOrder Int    @default(0) @map("sort_order")

  plan    CurriculumPlan     @relation(fields: [planId], references: [id], onDelete: Cascade)
  lessons CurriculumLesson[]

  @@map("curriculum_units")
}

model CurriculumLesson {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  unitId      String    @map("unit_id") @db.Uuid
  title       String
  outcomes    String?
  plannedDate DateTime? @map("planned_date") @db.Date
  sortOrder   Int       @default(0) @map("sort_order")

  unit     CurriculumUnit       @relation(fields: [unitId], references: [id], onDelete: Cascade)
  coverage CurriculumCoverage[]

  @@map("curriculum_lessons")
}

model CurriculumCoverage {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId   String    @map("school_id") @db.Uuid
  lessonId   String    @map("lesson_id") @db.Uuid
  classId    String    @map("class_id") @db.Uuid
  status     String    @default("not_started")
  coveredOn  DateTime? @map("covered_on") @db.Date
  recordedBy String?   @map("recorded_by") @db.Uuid

  school   School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  lesson   CurriculumLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  class    Class            @relation(fields: [classId], references: [id], onDelete: Cascade)
  recorder Profile?         @relation(fields: [recordedBy], references: [id], onDelete: SetNull)

  @@unique([lessonId, classId])
  @@map("curriculum_coverage")
}

model BehaviorRecord {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId    String   @map("school_id") @db.Uuid
  studentId   String   @map("student_id") @db.Uuid
  kind        String   // positive | negative
  category    String
  description String?
  actionTaken String?  @map("action_taken")
  points      Int?     @default(0)
  recordedBy  String?  @map("recorded_by") @db.Uuid
  date        DateTime @default(dbgenerated("current_date")) @db.Date
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  school   School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  student  Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  recorder Profile? @relation(fields: [recordedBy], references: [id], onDelete: SetNull)

  @@map("behavior_records")
}

model Room {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId  String  @map("school_id") @db.Uuid
  name      String
  capacity  Int?

  school         School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  timetableSlots TimetableSlot[]

  @@map("rooms")
}

model Period {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId  String   @map("school_id") @db.Uuid
  label     String
  startTime DateTime @map("start_time") @db.Time
  endTime   DateTime @map("end_time") @db.Time
  sortOrder Int      @default(0) @map("sort_order")

  school         School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  timetableSlots TimetableSlot[]

  @@map("periods")
}

model TimetableSlot {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId  String  @map("school_id") @db.Uuid
  classId   String  @map("class_id") @db.Uuid
  subjectId String? @map("subject_id") @db.Uuid
  staffId   String? @map("staff_id") @db.Uuid
  roomId    String? @map("room_id") @db.Uuid
  periodId  String  @map("period_id") @db.Uuid
  dayOfWeek Int     @map("day_of_week") // 0=Sunday

  school   School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  class    Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  subject  Subject? @relation(fields: [subjectId], references: [id], onDelete: SetNull)
  staff    Staff?   @relation(fields: [staffId], references: [id], onDelete: SetNull)
  room     Room?    @relation(fields: [roomId], references: [id], onDelete: SetNull)
  period   Period   @relation(fields: [periodId], references: [id], onDelete: Cascade)

  @@unique([classId, periodId, dayOfWeek])
  @@map("timetable_slots")
}

model Activity {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId     String    @map("school_id") @db.Uuid
  name         String
  kind         String?   // summer_club | camp | competition | sport | trip
  description  String?
  supervisorId String?   @map("supervisor_id") @db.Uuid
  startDate    DateTime? @map("start_date") @db.Date
  endDate      DateTime? @map("end_date") @db.Date
  fee          Decimal?  @default(0) @db.Decimal(10, 2)
  capacity     Int?
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz

  school       School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  supervisor   Staff?               @relation(fields: [supervisorId], references: [id], onDelete: SetNull)
  participants ActivityParticipant[]
  attendance   ActivityAttendance[]

  @@map("activities")
}

model ActivityParticipant {
  activityId String   @map("activity_id") @db.Uuid
  studentId  String   @map("student_id") @db.Uuid
  enrolledAt DateTime @default(now()) @map("enrolled_at") @db.Timestamptz
  feePaid    Boolean  @default(false) @map("fee_paid")

  activity Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  student  Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@id([activityId, studentId])
  @@map("activity_participants")
}

model ActivityAttendance {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  activityId String   @map("activity_id") @db.Uuid
  studentId  String   @map("student_id") @db.Uuid
  date       DateTime @db.Date
  present    Boolean  @default(true)

  activity Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  student  Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@map("activity_attendance")
}

model Observation {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId        String    @map("school_id") @db.Uuid
  staffId         String    @map("staff_id") @db.Uuid
  observerId      String?   @map("observer_id") @db.Uuid
  classId         String?   @map("class_id") @db.Uuid
  subjectId       String?   @map("subject_id") @db.Uuid
  date            DateTime  @default(dbgenerated("current_date")) @db.Date
  overallScore    Decimal?  @map("overall_score") @db.Decimal(5, 2)
  strengths       String?
  improvements    String?
  developmentPlan String?   @map("development_plan")
  status          String    @default("draft") // draft | submitted | acknowledged
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz

  school   School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  staff    Staff             @relation(fields: [staffId], references: [id], onDelete: Cascade)
  observer Profile?          @relation(fields: [observerId], references: [id], onDelete: SetNull)
  class    Class?            @relation(fields: [classId], references: [id], onDelete: SetNull)
  subject  Subject?          @relation(fields: [subjectId], references: [id], onDelete: SetNull)
  items    ObservationItem[]

  @@map("observations")
}

model ObservationItem {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  observationId String   @map("observation_id") @db.Uuid
  criterion     String
  score         Decimal? @db.Decimal(5, 2)
  note          String?

  observation Observation @relation(fields: [observationId], references: [id], onDelete: Cascade)

  @@map("observation_items")
}

// ============================================================
//  ADMIN, FINANCE & AUDIT  (0004_admin_finance_audit.sql)
// ============================================================

model ReportTemplate {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId  String   @map("school_id") @db.Uuid
  name      String
  kind      String   // report_card | attendance | certificate_quran | achievement | participation
  layout    Json     @default("{}")
  isDefault Boolean  @default(false) @map("is_default")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@map("report_templates")
}

model Announcement {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId    String    @map("school_id") @db.Uuid
  title       String
  body        String?
  audience    String    @default("all") // all | teachers | parents | students | class:<id>
  publishedAt DateTime? @map("published_at") @db.Timestamptz
  createdBy   String?   @map("created_by") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz

  school  School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  creator Profile? @relation(fields: [createdBy], references: [id], onDelete: SetNull)

  @@map("announcements")
}

model Notification {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId  String    @map("school_id") @db.Uuid
  userId    String?   @map("user_id") @db.Uuid
  title     String
  body      String?
  kind      String?   // attendance | grade | announcement | event
  readAt    DateTime? @map("read_at") @db.Timestamptz
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz

  school School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  user   Profile? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

model MessageLog {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId  String   @map("school_id") @db.Uuid
  channel   String   // email | sms | whatsapp | push
  recipient String
  template  String?
  payload   Json?
  status    String   @default("queued") // queued | sent | failed
  error     String?
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@map("message_log")
}

model FeeStructure {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId       String    @map("school_id") @db.Uuid
  name           String
  gradeLevelId   String?   @map("grade_level_id") @db.Uuid
  academicYearId String?   @map("academic_year_id") @db.Uuid
  amount         Decimal   @default(0) @db.Decimal(10, 2)
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz

  school       School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  gradeLevel   GradeLevel?   @relation(fields: [gradeLevelId], references: [id], onDelete: SetNull)
  academicYear AcademicYear? @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

  @@map("fee_structures")
}

model Invoice {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId       String    @map("school_id") @db.Uuid
  studentId      String    @map("student_id") @db.Uuid
  academicYearId String?   @map("academic_year_id") @db.Uuid
  number         String?
  total          Decimal   @default(0) @db.Decimal(10, 2)
  discount       Decimal   @default(0) @db.Decimal(10, 2)
  status         String    @default("unpaid") // unpaid | partial | paid | void
  dueDate        DateTime? @map("due_date") @db.Date
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz

  school       School         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  student      Student        @relation(fields: [studentId], references: [id], onDelete: Cascade)
  academicYear AcademicYear?  @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  items        InvoiceItem[]
  installments Installment[]
  payments     Payment[]

  @@map("invoices")
}

model InvoiceItem {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  invoiceId   String  @map("invoice_id") @db.Uuid
  description String
  amount      Decimal @default(0) @db.Decimal(10, 2)

  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@map("invoice_items")
}

model Installment {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  invoiceId String   @map("invoice_id") @db.Uuid
  dueDate   DateTime @map("due_date") @db.Date
  amount    Decimal  @db.Decimal(10, 2)
  paid      Boolean  @default(false)

  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@map("installments")
}

model Payment {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  schoolId   String   @map("school_id") @db.Uuid
  invoiceId  String   @map("invoice_id") @db.Uuid
  amount     Decimal  @db.Decimal(10, 2)
  method     String?  // cash | card | transfer | knet
  paidAt     DateTime @default(now()) @map("paid_at") @db.Timestamptz
  receivedBy String?  @map("received_by") @db.Uuid

  school   School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  invoice  Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  receiver Profile? @relation(fields: [receivedBy], references: [id], onDelete: SetNull)

  @@map("payments")
}

model AuditLog {
  id        BigInt    @id @default(autoincrement())
  schoolId  String?   @map("school_id") @db.Uuid
  userId    String?   @map("user_id") @db.Uuid
  userEmail String?   @map("user_email")
  action    String
  entity    String?
  entityId  String?   @map("entity_id")
  meta      Json?
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz

  school School?  @relation(fields: [schoolId], references: [id], onDelete: SetNull)
  user   Profile? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("audit_logs")
}
```

### 4.3 Generating the Prisma Client

```bash
npx prisma generate
```

This writes the typed client to `node_modules/@prisma/client`. Import it in
server-only code:

```ts
// src/lib/prisma.ts  (new file — only if using Prisma)
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query"] : [] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Example query — fetch a student's active enrollments with class name:

```ts
// Server Action excerpt
const enrollments = await prisma.studentEnrollment.findMany({
  where: { studentId, status: "enrolled" },
  include: { class: { select: { name: true } }, academicYear: true },
  orderBy: { createdAt: "desc" },
});
```

> **Never use Prisma Client in Client Components.** The `DATABASE_URL` superuser
> credential must never reach the browser. Keep all Prisma imports inside
> `src/app/(app)/**/page.tsx` server components, Server Actions, or Route
> Handlers, and mark any shared file with a top-level `"use server"` or keep it
> in a `server/` sub-directory.

---

## 5. Trade-off Comparison

| Concern | SQL migrations + Supabase client | SQL migrations + Prisma Client |
|---|---|---|
| **RLS enforcement** | Automatic — every query goes through PostgREST and RLS policies in migration `0005` | **Bypassed** — Prisma uses the direct Postgres connection with superuser creds. You must enforce school isolation manually or use a middleware approach |
| **Type safety** | Full, via generated `database.types.ts` + `createServerClient<Database>` | Full, via `prisma generate`; relation types are richer out of the box |
| **Complex joins** | Verbose (PostgREST nested selects or raw RPC); readable for simple CRUD | Elegant `include`/`select` DSL; `$queryRaw` for anything advanced |
| **Supabase-specific features** | Native (Auth, Storage, Realtime, RLS helpers, `auth.uid()`) | Must be called separately through `@supabase/supabase-js` alongside Prisma |
| **Migration workflow** | SQL files in `supabase/migrations/`; CLI or dashboard | Must write two artefacts: the SQL migration AND keep `schema.prisma` in sync |
| **`updated_at` triggers** | `set_updated_at()` trigger handles it DB-side (`0001`) | `@updatedAt` handles it in the application layer — they will conflict if both are active |
| **`citext` columns** | Supported natively | Prisma maps `citext` to `String`; case-insensitivity is transparent but not modelled |
| **Partial / functional indexes** | Fully expressible in SQL | Must be added via `@@index` with `map:` or a raw migration; Prisma ignores partial predicates in its schema |
| **Generated-always identity** | `audit_logs.id bigint generated always as identity` works natively | Prisma maps to `@default(autoincrement())`; `GENERATED ALWAYS` requires a raw migration workaround |
| **Bundle size** | Zero — `@supabase/supabase-js` is already a dependency | Adds `@prisma/client` (~2 MB native binaries); irrelevant for server-only code but worth noting |
| **When to choose** | Default for this project | When you need rich relational queries or an ORM abstraction for a complex reporting layer |

### 5.1 Recommended hybrid pattern (if you add Prisma)

```
Read-path (complex reporting) ──► Prisma Client  (superuser, manual school_id filter)
Write-path (normal user ops)  ──► Supabase client (RLS-enforced, PostgREST)
Realtime / Auth / Storage     ──► Supabase client always
```

Always pass `where: { schoolId: profile.schoolId }` on every Prisma query and
validate the session before doing so. The Supabase client on write paths ensures
RLS remains the safety net.

---

## 6. Keeping Everything in Sync

The migration → types → optional Prisma pipeline has three steps:

```mermaid
flowchart LR
    A["Edit / add\nSQL migration file"] --> B["supabase db push\nor db reset"]
    B --> C["npm run db:types\n(regenerate database.types.ts)"]
    C --> D["npx prisma generate\n(if using Prisma)"]
    D --> E["npm run typecheck\n(tsc --noEmit)"]
    E --> F["Commit all three artefacts\n(migration + .ts types + schema.prisma)"]
```

Steps C, D, and E should be run locally before every PR and can be added to a
pre-commit hook or CI step:

```yaml
# .github/workflows/typecheck.yml (example)
- name: Generate DB types
  run: npm run db:types
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
- name: Type check
  run: npm run typecheck
```

---

## 7. Quick Reference

| Command | Effect |
|---|---|
| `supabase db push` | Apply pending migrations to the linked remote project |
| `supabase db reset` | Wipe local Docker DB and re-apply all migrations from scratch |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the linked project's schema |
| `npx prisma generate` | Regenerate `@prisma/client` from `prisma/schema.prisma` |
| `npx prisma studio` | Open local GUI database browser (uses `DATABASE_URL`) |
| `npm run typecheck` | Run `tsc --noEmit` — fails if types are stale |

---

*Document maintained alongside the SQL migrations. When a column or table is added,
update the relevant migration file first, then regenerate types. If the Prisma schema
is in use, update `schema.prisma` as the third step — never the first.*
