# 10 · API Endpoints & Server Actions

> **Madrasati ERP** — نظام مدرستي  
> API surface reference: Next.js 15 server actions (internal) **and** REST / PostgREST equivalents (external / mobile clients).

---

## Table of Contents

1. [Auth & Sessions](#1-auth--sessions)
2. [Schools & Tenancy](#2-schools--tenancy)
3. [Users & Profiles](#3-users--profiles)
4. [Students (الطلاب)](#4-students-الطلاب)
5. [Teachers / Staff (المعلمون)](#5-teachers--staff-المعلمون)
6. [Classes (الفصول)](#6-classes-الفصول)
7. [Subjects & Departments (المواد والأقسام)](#7-subjects--departments-المواد-والأقسام)
8. [Attendance (الحضور والغياب)](#8-attendance-الحضور-والغياب)
9. [Grades & Assessments (الدرجات)](#9-grades--assessments-الدرجات)
10. [Islamic Studies / Quran (الدراسات الإسلامية)](#10-islamic-studies--quran-الدراسات-الإسلامية)
11. [Curriculum Coverage (تغطية المنهج)](#11-curriculum-coverage-تغطية-المنهج)
12. [Behavior & Discipline (السلوك والانضباط)](#12-behavior--discipline-السلوك-والانضباط)
13. [Timetable (الجدول الدراسي)](#13-timetable-الجدول-الدراسي)
14. [Activities (الأنشطة)](#14-activities-الأنشطة)
15. [Observations (الملاحظات الإشرافية)](#15-observations-الملاحظات-الإشرافية)
16. [Communication (التواصل)](#16-communication-التواصل)
17. [Finance (المالية)](#17-finance-المالية)
18. [Audit Trail (سجل التدقيق)](#18-audit-trail-سجل-التدقيق)
19. [External / Mobile Client Guide](#19-external--mobile-client-guide)

---

## Overview

### Two API Layers

```
┌────────────────────────────────────────────────────────────┐
│  Next.js 15 App Router                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React Server Components  →  Server Actions          │   │
│  │  ("use server" functions in src/features/*/actions) │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │ HTTP/RPC                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Supabase PostgREST  (auto-REST for every table)    │   │
│  │  Supabase Auth REST  (/auth/v1/*)                   │   │
│  │  Supabase Edge Functions  (custom business logic)   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │ pg driver                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Postgres 15 + RLS  (all enforcement here)          │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### Auth Flow

All requests (server action **or** REST) must carry a Supabase JWT issued at sign-in. Every table enforces Row Level Security (RLS) via the helpers:

| Helper | Definition |
|---|---|
| `current_school_id()` | `SELECT school_id FROM profiles WHERE id = auth.uid()` |
| `current_role()` | `SELECT role FROM profiles WHERE id = auth.uid()` |
| `is_super_admin()` | role = `'super_admin'` |
| `has_perm(perm text)` | Caller's role has `perm` in `role_permissions`, or has wildcard `'*'` |
| `in_my_school(row_school uuid)` | `is_super_admin() OR row_school = current_school_id()` |

Server actions additionally call `requireSession()` (src/lib/auth.ts) and `hasPermission(role, perm)` (src/lib/rbac.ts) before touching the database. This gives two independent enforcement layers: application-level guard + database-level RLS.

### Response Envelope (Server Actions)

```ts
type ActionResult = { ok: true } | { ok: false; error: string }
```

Successful mutations also call `revalidatePath(route)` so the Next.js cache is cleared.

### REST Base URL

```
https://<SUPABASE_PROJECT_REF>.supabase.co/rest/v1/
```

All REST calls require:

```
Authorization: Bearer <JWT>
apikey: <anon or service_role key>
```

---

## 1. Auth & Sessions

### 1.1 Server Actions

Auth is handled entirely by `@supabase/ssr`. There are no custom server actions for sign-in/sign-out; those call the Supabase client directly from the browser.

```ts
// Sign in (client component)
const { error } = await supabase.auth.signInWithPassword({ email, password });

// Sign out (client component)
await supabase.auth.signOut();

// Password update (server action, authenticated)
await supabase.auth.updateUser({ password: newPassword });
```

On successful sign-in, Supabase triggers `handle_new_user()` (migration 0001) which inserts a row into `public.profiles`. The `must_change_password` flag on the profile drives a forced-redirect flow in the Next.js middleware.

### 1.2 REST Equivalents

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/v1/token?grant_type=password` | Sign in with email + password, returns `access_token` |
| `POST` | `/auth/v1/logout` | Invalidate session |
| `PUT` | `/auth/v1/user` | Update email or password |
| `GET` | `/auth/v1/user` | Get current authenticated user |
| `POST` | `/auth/v1/magiclink` | Passwordless email link |
| `POST` | `/auth/v1/recover` | Password recovery email |

---

## 2. Schools & Tenancy

### 2.1 DB Table: `public.schools`

Key columns: `id`, `name_ar`, `name_en`, `slug`, `logo_url`, `theme` (jsonb), `calendar` (`gregorian`|`hijri`), `is_active`.

### 2.2 RLS Policy

- **SELECT**: `is_super_admin() OR id = current_school_id()`
- **INSERT**: `is_super_admin()` only
- **UPDATE**: `in_my_school(id) AND (has_perm('settings:write') OR has_perm('branding:write'))`

### 2.3 Server Actions (planned — `src/features/settings/actions.ts`)

| Function | Permission | Description |
|---|---|---|
| `updateSchoolSettings(id, input)` | `settings:write` | General info, phone, address, calendar |
| `updateSchoolBranding(id, input)` | `branding:write` | `logo_url`, `stamp_url`, `theme` JSON |
| `createSchool(input)` | `super_admin` only | Provision a new tenant |

### 2.4 REST Equivalents

| Method | Path | Auth |
|---|---|---|
| `GET` | `/rest/v1/schools?id=eq.<id>` | Any authenticated user in school |
| `PATCH` | `/rest/v1/schools?id=eq.<id>` | `settings:write` or `branding:write` |
| `POST` | `/rest/v1/schools` | `super_admin` |

---

## 3. Users & Profiles

### 3.1 DB Table: `public.profiles`

Key columns: `id` (= auth.users.id), `school_id`, `email`, `full_name`, `role`, `avatar_url`, `must_change_password`.

### 3.2 RLS Policy

- **SELECT**: `id = auth.uid() OR is_super_admin() OR (same_school AND has_perm('users:manage'))`
- **UPDATE**: same condition

### 3.3 Server Actions (planned — `src/features/users/actions.ts`)

| Function | Signature | Permission | Validation |
|---|---|---|---|
| `inviteUser` | `(email, role, school_id?) => ActionResult` | `users:manage` | email format; role in `ROLES` |
| `updateProfile` | `(id, { full_name, avatar_url }) => ActionResult` | own row or `users:manage` | string min/max |
| `changeUserRole` | `(id, role) => ActionResult` | `users:manage` | role in ROLES; can't demote only super_admin |
| `deactivateUser` | `(id) => ActionResult` | `users:manage` | cannot self-deactivate |

### 3.4 REST Equivalents

| Method | Path | Auth |
|---|---|---|
| `GET` | `/rest/v1/profiles?school_id=eq.<id>` | `users:manage` |
| `GET` | `/rest/v1/profiles?id=eq.<uid>` | Own profile |
| `PATCH` | `/rest/v1/profiles?id=eq.<id>` | `users:manage` or own row |

**Invite** is handled via Supabase Admin API (service_role key, not exposed to clients):
```
POST /auth/v1/admin/users  { email, password?, user_metadata: { role, school_id } }
```

---

## 4. Students (الطلاب)

### 4.1 DB Tables

- `public.students` — master record
- `public.student_enrollments` — one row per year/class (history)
- `public.guardians` + `public.student_guardians` — parent/guardian links

### 4.2 Key Columns (`students`)

`id`, `school_id`, `student_no`, `ministry_no`, `civil_id`, `name_ar`, `name_en`, `gender`, `dob`, `nationality`, `religion`, `address`, `medical_notes`, `enrollment_date`, `status` (`enrolled`|`transferred`|`withdrawn`|`graduated`|`archived`), `guardian_name`, `guardian_mobile`, `guardian_email`, `current_class_id`, `photo_url`.

### 4.3 Server Actions — `src/features/students/actions.ts`

#### `createStudent(input: StudentInput): Promise<ActionResult>`

```ts
// Permission check
if (!hasPermission(profile.role, "students:write")) return { ok: false, error: "forbidden" }

// Validation — studentSchema (src/features/students/schema.ts)
const parsed = studentSchema.safeParse(input); // zod schema

// DB insert
supabase.from("students").insert({ ...parsed.data, school_id: profile.schoolId })

// Audit
logAudit("student.create", "students", data.id, { name: parsed.data.name_ar })
revalidatePath("/students")
```

**Zod schema** (`src/features/students/schema.ts`) — required fields:

| Field | Rule |
|---|---|
| `name_ar` | `string().min(2)` |
| `gender` | `enum(["male", "female"])` |
| `status` | `enum(["enrolled","transferred","withdrawn","graduated","archived"])` |
| `guardian_email` | `email()` if provided |
| `current_class_id` | `uuid()` if provided |

All other fields optional/nullable.

#### `updateStudent(id: string, input: StudentInput): Promise<ActionResult>`

Same permission (`students:write`) and validation. Calls `supabase.from("students").update(parsed.data).eq("id", id)`. Audit action: `student.update`.

#### `archiveStudent(id: string): Promise<ActionResult>`

Permission: `students:write`. Sets `status = 'archived'` (soft delete — preserves enrollment history, grades, attendance). Audit action: `student.archive`.

### 4.4 Additional Actions (planned)

| Function | Permission | Notes |
|---|---|---|
| `transferStudent(id, new_class_id, year_id)` | `students:write` | Updates `current_class_id`; inserts `student_enrollments` row |
| `importStudents(csv)` | `students:import` | Batch upsert on `(school_id, ministry_no)` |
| `deleteStudent(id)` | `students:delete` | Hard delete; only for erroneous entries |
| `addGuardian(student_id, guardian)` | `students:write` | Inserts `guardians` + `student_guardians` |

### 4.5 REST Equivalents

| Method | Path | Permission | Notes |
|---|---|---|---|
| `GET` | `/rest/v1/students?school_id=eq.<id>&select=*,classes(name)` | `students:read` | Join class name |
| `GET` | `/rest/v1/students?id=eq.<id>&select=*,student_enrollments(*),student_guardians(*,guardians(*))` | `students:read` | Full profile with history |
| `POST` | `/rest/v1/students` | `students:write` | Body: StudentInput + school_id |
| `PATCH` | `/rest/v1/students?id=eq.<id>` | `students:write` | Partial update |
| `DELETE` | `/rest/v1/students?id=eq.<id>` | `students:delete` | Hard delete |
| `GET` | `/rest/v1/student_enrollments?student_id=eq.<id>` | `students:read` | Enrollment history |
| `GET` | `/rest/v1/guardians?school_id=eq.<id>` | `students:read` | All guardians |

---

## 5. Teachers / Staff (المعلمون)

### 5.1 DB Tables

- `public.staff` — teacher/staff records
- `public.teaching_assignments` — staff × subject × class × academic_year

### 5.2 Key Columns (`staff`)

`id`, `school_id`, `profile_id` (→ profiles.id), `employee_no`, `civil_id`, `name_ar`, `name_en`, `department_id`, `position`, `qualifications`, `experience_years`, `email`, `mobile`, `hire_date`, `status` (`active`|`inactive`|`archived`).

### 5.3 Server Actions (planned — `src/features/teachers/actions.ts`)

| Function | Signature | Permission | Validation |
|---|---|---|---|
| `createStaff` | `(input) => ActionResult` | `teachers:write` | `name_ar` required; `email` format if provided |
| `updateStaff` | `(id, input) => ActionResult` | `teachers:write` | Same schema |
| `archiveStaff` | `(id) => ActionResult` | `teachers:write` | Sets `status = 'archived'` |
| `assignTeaching` | `(staff_id, subject_id, class_id, year_id) => ActionResult` | `teachers:write` | Unique constraint: one teacher per subject per class per year |
| `removeTeachingAssignment` | `(id) => ActionResult` | `teachers:write` | — |

### 5.4 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/staff?school_id=eq.<id>&select=*,departments(name_ar)` | `teachers:read` |
| `GET` | `/rest/v1/staff?id=eq.<id>&select=*,teaching_assignments(*,subjects(*),classes(*))` | `teachers:read` |
| `POST` | `/rest/v1/staff` | `teachers:write` |
| `PATCH` | `/rest/v1/staff?id=eq.<id>` | `teachers:write` |
| `GET` | `/rest/v1/teaching_assignments?class_id=eq.<id>` | `classes:read` |
| `POST` | `/rest/v1/teaching_assignments` | `teachers:write` |
| `DELETE` | `/rest/v1/teaching_assignments?id=eq.<id>` | `teachers:write` |

---

## 6. Classes (الفصول)

### 6.1 DB Tables

- `public.academic_years` — school year container
- `public.school_stages` — المرحلة (ابتدائي / متوسط / ثانوي)
- `public.grade_levels` — الصف (grade 1..12)
- `public.classes` — الفصل (الصف الثالث أ)

### 6.2 Key Columns (`classes`)

`id`, `school_id`, `academic_year_id`, `grade_level_id`, `name`, `capacity` (default 42), `class_teacher_id` (→ staff), `student_count` (auto-maintained by trigger `refresh_class_count`), `status` (`active`|`archived`).

### 6.3 Server Actions (planned — `src/features/classes/actions.ts`)

| Function | Permission | Validation |
|---|---|---|
| `createClass(input)` | `classes:write` | `name` required; `grade_level_id` UUID; `capacity` int > 0 |
| `updateClass(id, input)` | `classes:write` | Same |
| `archiveClass(id)` | `classes:write` | Sets `status = 'archived'` |
| `setCurrentYear(year_id)` | `settings:write` | Clears prior `is_current`; sets new — enforced by unique partial index |

### 6.4 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/classes?academic_year_id=eq.<id>&select=*,grade_levels(name_ar),staff(name_ar)` | `classes:read` |
| `POST` | `/rest/v1/classes` | `classes:write` |
| `PATCH` | `/rest/v1/classes?id=eq.<id>` | `classes:write` |
| `GET` | `/rest/v1/academic_years?school_id=eq.<id>&order=start_date.desc` | `reports:read` |
| `GET` | `/rest/v1/grade_levels?school_id=eq.<id>&order=sort_order` | `reports:read` |
| `GET` | `/rest/v1/school_stages?school_id=eq.<id>&order=sort_order` | `reports:read` |

---

## 7. Subjects & Departments (المواد والأقسام)

### 7.1 DB Tables

- `public.departments` — قسم (key: `id`, `school_id`, `name_ar`, `name_en`, `head_id` → staff)
- `public.subjects` — مادة (key: `id`, `school_id`, `department_id`, `name_ar`, `code`, `weekly_periods`)

Unique constraint: `(school_id, code)` on subjects.

### 7.2 Server Actions (planned — `src/features/subjects/actions.ts`, `src/features/departments/actions.ts`)

| Function | Permission | Validation |
|---|---|---|
| `createDepartment(input)` | `departments:write` | `name_ar` required |
| `updateDepartment(id, input)` | `departments:write` | `head_id` UUID if set |
| `createSubject(input)` | `subjects:write` | `name_ar`, `code` required; `code` unique in school |
| `updateSubject(id, input)` | `subjects:write` | Same; code uniqueness re-checked |
| `deleteSubject(id)` | `subjects:write` | Blocked if teaching_assignments exist (FK) |

### 7.3 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/subjects?school_id=eq.<id>&select=*,departments(name_ar)` | `subjects:read` |
| `POST` | `/rest/v1/subjects` | `subjects:write` |
| `PATCH` | `/rest/v1/subjects?id=eq.<id>` | `subjects:write` |
| `GET` | `/rest/v1/departments?school_id=eq.<id>&select=*,staff(name_ar)` | `departments:read` |
| `POST` | `/rest/v1/departments` | `departments:write` |

---

## 8. Attendance (الحضور والغياب)

### 8.1 DB Table: `public.attendance_records`

Key columns: `id`, `school_id`, `student_id`, `class_id`, `date`, `status` (`present`|`absent`|`excused`|`late`|`medical`), `note`, `recorded_by` (→ profiles).

Unique constraint: `(student_id, date)` — one attendance record per student per day.

Index: `(class_id, date)` for bulk lookups; `(school_id, date)` for school-wide reports.

### 8.2 Server Actions (planned — `src/features/attendance/actions.ts`)

| Function | Signature | Permission | Validation |
|---|---|---|---|
| `saveAttendance` | `(class_id, date, records: {student_id, status, note?}[]) => ActionResult` | `attendance:write` | date format; status in enum; student belongs to class |
| `updateAttendanceRecord` | `(id, { status, note }) => ActionResult` | `attendance:write` | status in enum |
| `getAttendanceByClass` | `(class_id, date) => AttendanceRow[]` | `attendance:read` | Called server-side in page component |
| `getStudentAttendance` | `(student_id, from, to) => AttendanceRow[]` | `attendance:read` | date range |

`saveAttendance` uses `upsert` on the unique `(student_id, date)` constraint:

```ts
supabase.from("attendance_records").upsert(
  records.map(r => ({
    school_id: profile.schoolId,
    class_id,
    date,
    recorded_by: profile.id,
    ...r
  })),
  { onConflict: "student_id,date" }
)
```

### 8.3 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/attendance_records?class_id=eq.<id>&date=eq.<YYYY-MM-DD>` | `attendance:read` |
| `GET` | `/rest/v1/attendance_records?student_id=eq.<id>&date=gte.<from>&date=lte.<to>` | `attendance:read` |
| `POST` | `/rest/v1/attendance_records` | `attendance:write` |
| `PUT` (upsert) | `/rest/v1/attendance_records?on_conflict=student_id,date` with header `Prefer: resolution=merge-duplicates` | `attendance:write` |
| `PATCH` | `/rest/v1/attendance_records?id=eq.<id>` | `attendance:write` |

**Statistics** (use Supabase RPC or Edge Function):

```
GET /rest/v1/rpc/student_attendance_summary
Body: { student_id: "...", from: "2025-09-01", to: "2026-06-30" }
Returns: { present, absent, excused, late, medical, total }
```

---

## 9. Grades & Assessments (الدرجات)

### 9.1 DB Tables

```
assessment_types  (weight, max_score)
       │
assessments  (class_id, subject_id, term, title, max_score, date)
       │
grades  (assessment_id, student_id, score, note)

grade_scales  (min_pct, max_pct, letter, gpa, label_ar)
report_cards  (student_id, term, gpa, average, rank, data jsonb)
```

### 9.2 Server Actions (planned — `src/features/grades/actions.ts`)

| Function | Signature | Permission | Validation |
|---|---|---|---|
| `createAssessment` | `(input) => ActionResult` | `grades:write` | `title`, `class_id`, `subject_id`, `term` int 1..4, `max_score` > 0 |
| `saveGrades` | `(assessment_id, grades: {student_id, score, note?}[]) => ActionResult` | `grades:write` | `score` ≤ `assessment.max_score`; student in class |
| `updateGrade` | `(id, { score, note }) => ActionResult` | `grades:write` | score bounds |
| `generateReportCard` | `(student_id, year_id, term) => ActionResult` | `grades:write` | Computes GPA via grade_scales, stores in `report_cards.data` jsonb |
| `getGradesByClass` | `(class_id, subject_id, term) => GradeRow[]` | `grades:read` | — |

`saveGrades` upserts on `(assessment_id, student_id)`:

```ts
supabase.from("grades").upsert(
  grades.map(g => ({ school_id, assessment_id, ...g })),
  { onConflict: "assessment_id,student_id" }
)
```

### 9.3 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/assessments?class_id=eq.<id>&subject_id=eq.<id>&term=eq.<n>` | `grades:read` |
| `POST` | `/rest/v1/assessments` | `grades:write` |
| `GET` | `/rest/v1/grades?assessment_id=eq.<id>&select=*,students(name_ar)` | `grades:read` |
| `POST` | `/rest/v1/grades` (upsert) | `grades:write` |
| `GET` | `/rest/v1/report_cards?student_id=eq.<id>&term=eq.<n>` | `reports:read` |
| `GET` | `/rest/v1/grade_scales?school_id=eq.<id>&order=min_pct` | `grades:read` |
| `GET` | `/rest/v1/assessment_types?school_id=eq.<id>&order=sort_order` | `grades:read` |

---

## 10. Islamic Studies / Quran (الدراسات الإسلامية)

### 10.1 DB Tables

- `public.quran_surahs` — reference table (114 rows, seeded; `number`, `name_ar`, `ayah_count`)
- `public.quran_memorization` — per-student surah memorization tracking
- `public.quran_revisions` — revision sessions log

### 10.2 Key Columns (`quran_memorization`)

`id`, `school_id`, `student_id`, `surah_number` (FK → quran_surahs), `from_ayah`, `to_ayah`, `status` (`not_started`|`in_progress`|`memorized`), `score`, `tajweed_score`, `assessed_by` (→ profiles), `assessed_at`.

### 10.3 Server Actions (planned — `src/features/islamic/actions.ts`)

| Function | Signature | Permission | Validation |
|---|---|---|---|
| `upsertMemorization` | `(student_id, surah_number, input) => ActionResult` | `islamic:write` | `surah_number` 1..114; scores 0..100 |
| `addRevision` | `(student_id, surah_number, date, quality, note?) => ActionResult` | `islamic:write` | `quality` in (`excellent`\|`good`\|`fair`\|`weak`) |
| `getStudentMemorizationProgress` | `(student_id) => MemorizationRow[]` | `islamic:read` | Joins quran_surahs |

`quran_surahs` is a reference table: **SELECT** open to any authenticated user; **mutations** only by `is_super_admin()`.

### 10.4 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/quran_surahs?order=number` | Any authenticated |
| `GET` | `/rest/v1/quran_memorization?student_id=eq.<id>&select=*,quran_surahs(name_ar)` | `islamic:read` |
| `POST` | `/rest/v1/quran_memorization` | `islamic:write` |
| `PATCH` | `/rest/v1/quran_memorization?id=eq.<id>` | `islamic:write` |
| `GET` | `/rest/v1/quran_revisions?student_id=eq.<id>&order=date.desc` | `islamic:read` |
| `POST` | `/rest/v1/quran_revisions` | `islamic:write` |

---

## 11. Curriculum Coverage (تغطية المنهج)

### 11.1 DB Tables

```
curriculum_plans  (subject_id, grade_level_id, academic_year_id, title)
       └── curriculum_units  (title, sort_order)
               └── curriculum_lessons  (title, outcomes, planned_date, sort_order)
                           │
curriculum_coverage  (lesson_id, class_id, status, covered_on, recorded_by)
```

`curriculum_coverage` has a unique constraint on `(lesson_id, class_id)`.

Child tables (`curriculum_units`, `curriculum_lessons`) do not carry `school_id`; RLS policies scope them via the parent plan join.

### 11.2 Server Actions (planned — `src/features/curriculum/actions.ts`)

| Function | Permission | Validation |
|---|---|---|
| `createPlan(input)` | `curriculum:write` | `subject_id`, `academic_year_id`, `title` required |
| `addUnit(plan_id, title)` | `curriculum:write` | `plan_id` must belong to caller's school |
| `addLesson(unit_id, input)` | `curriculum:write` | `title` required; `planned_date` ISO date if set |
| `setCoverage(lesson_id, class_id, status)` | `curriculum:write` | `status` in (`not_started`\|`in_progress`\|`completed`); upsert on unique pair |

### 11.3 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/curriculum_plans?school_id=eq.<id>&select=*,subjects(name_ar),grade_levels(name_ar)` | `curriculum:read` |
| `GET` | `/rest/v1/curriculum_units?plan_id=eq.<id>&order=sort_order` | `curriculum:read` |
| `GET` | `/rest/v1/curriculum_lessons?unit_id=eq.<id>&order=sort_order` | `curriculum:read` |
| `GET` | `/rest/v1/curriculum_coverage?class_id=eq.<id>` | `curriculum:read` |
| `POST` | `/rest/v1/curriculum_coverage` (upsert, `Prefer: resolution=merge-duplicates`) | `curriculum:write` |

---

## 12. Behavior & Discipline (السلوك والانضباط)

### 12.1 DB Table: `public.behavior_records`

Key columns: `id`, `school_id`, `student_id`, `kind` (`positive`|`negative`), `category` (free text — e.g. `award`, `leadership`, `warning`, `misconduct`, `suspension`), `description`, `action_taken`, `points` (int, default 0), `recorded_by` (→ profiles), `date`.

### 12.2 Server Actions (planned — `src/features/behavior/actions.ts`)

| Function | Signature | Permission | Validation |
|---|---|---|---|
| `createBehaviorRecord` | `(input) => ActionResult` | `behavior:write` | `kind` in enum; `student_id` UUID; `date` ISO; `points` int |
| `updateBehaviorRecord` | `(id, input) => ActionResult` | `behavior:write` | Same fields |
| `deleteBehaviorRecord` | `(id) => ActionResult` | `behavior:write` | Hard delete (no archive needed for corrections) |
| `getStudentBehavior` | `(student_id, from?, to?) => BehaviorRow[]` | `behavior:read` | — |

### 12.3 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/behavior_records?student_id=eq.<id>&order=date.desc` | `behavior:read` |
| `GET` | `/rest/v1/behavior_records?class_id=in.(<ids>)&kind=eq.negative&date=gte.<from>` | `behavior:read` |
| `POST` | `/rest/v1/behavior_records` | `behavior:write` |
| `PATCH` | `/rest/v1/behavior_records?id=eq.<id>` | `behavior:write` |
| `DELETE` | `/rest/v1/behavior_records?id=eq.<id>` | `behavior:write` |

---

## 13. Timetable (الجدول الدراسي)

### 13.1 DB Tables

- `public.rooms` — `(id, school_id, name, capacity)`
- `public.periods` — `(id, school_id, label, start_time, end_time, sort_order)`
- `public.timetable_slots` — `(id, school_id, class_id, subject_id, staff_id, room_id, period_id, day_of_week 0–6)`

Unique constraints:
- `(class_id, period_id, day_of_week)` — class can't be in two subjects at once
- `(staff_id, period_id, day_of_week)` where `staff_id IS NOT NULL` — teacher conflict guard

### 13.2 Server Actions (planned — `src/features/timetable/actions.ts`)

| Function | Permission | Validation |
|---|---|---|
| `upsertTimetableSlot(input)` | `timetable:write` | `day_of_week` 0–6; refs must exist in school |
| `deleteTimetableSlot(id)` | `timetable:write` | — |
| `createPeriod(input)` | `timetable:write` | `start_time < end_time`; `label` required |
| `createRoom(input)` | `timetable:write` | `name` required |

### 13.3 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/timetable_slots?class_id=eq.<id>&select=*,subjects(name_ar),staff(name_ar),rooms(name),periods(label,start_time,end_time)` | `timetable:read` |
| `GET` | `/rest/v1/timetable_slots?staff_id=eq.<id>` | `timetable:read` |
| `POST` | `/rest/v1/timetable_slots` | `timetable:write` |
| `DELETE` | `/rest/v1/timetable_slots?id=eq.<id>` | `timetable:write` |
| `GET` | `/rest/v1/periods?school_id=eq.<id>&order=sort_order` | `timetable:read` |
| `GET` | `/rest/v1/rooms?school_id=eq.<id>` | `timetable:read` |

---

## 14. Activities (الأنشطة)

### 14.1 DB Tables

- `public.activities` — `(id, school_id, name, kind, description, supervisor_id, start_date, end_date, fee, capacity)`
- `public.activity_participants` — `(activity_id, student_id, enrolled_at, fee_paid)`
- `public.activity_attendance` — `(id, activity_id, student_id, date, present)`

`kind` values: `summer_club`, `camp`, `competition`, `sport`, `trip` (free text, extensible).

### 14.2 Server Actions (planned — `src/features/activities/actions.ts`)

| Function | Permission | Validation |
|---|---|---|
| `createActivity(input)` | `activities:write` | `name` required; `end_date >= start_date`; `capacity` > 0 if set |
| `enrollStudent(activity_id, student_id)` | `activities:write` | Check capacity not exceeded |
| `unenrollStudent(activity_id, student_id)` | `activities:write` | — |
| `markFeePaid(activity_id, student_id)` | `activities:write` | Sets `fee_paid = true` |
| `saveActivityAttendance(activity_id, date, records)` | `activities:write` | One row per student per date |

### 14.3 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/activities?school_id=eq.<id>&order=start_date.desc` | `activities:read` |
| `POST` | `/rest/v1/activities` | `activities:write` |
| `PATCH` | `/rest/v1/activities?id=eq.<id>` | `activities:write` |
| `GET` | `/rest/v1/activity_participants?activity_id=eq.<id>&select=*,students(name_ar)` | `activities:read` |
| `POST` | `/rest/v1/activity_participants` | `activities:write` |
| `DELETE` | `/rest/v1/activity_participants?activity_id=eq.<id>&student_id=eq.<id>` | `activities:write` |
| `POST` | `/rest/v1/activity_attendance` (upsert) | `activities:write` |

---

## 15. Observations (الملاحظات الإشرافية)

### 15.1 DB Tables

- `public.observations` — `(id, school_id, staff_id, observer_id, class_id, subject_id, date, overall_score, strengths, improvements, development_plan, status)`
- `public.observation_items` — `(id, observation_id, criterion, score, note)`

`status` lifecycle: `draft` → `submitted` → `acknowledged`

### 15.2 Server Actions (planned — `src/features/observations/actions.ts`)

| Function | Permission | Notes |
|---|---|---|
| `createObservation(input)` | `observations:write` | Creates header + items in a transaction |
| `updateObservation(id, input)` | `observations:write` | Only while `status = 'draft'` |
| `submitObservation(id)` | `observations:write` | Sets `status = 'submitted'`; triggers notification to observed teacher |
| `acknowledgeObservation(id)` | `observations:write` | Teacher sets `status = 'acknowledged'` |
| `addObservationItem(observation_id, item)` | `observations:write` | Appended during draft phase |

### 15.3 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/observations?school_id=eq.<id>&select=*,staff(name_ar),profiles!observer_id(full_name)` | `observations:read` |
| `GET` | `/rest/v1/observations?staff_id=eq.<id>&order=date.desc` | `observations:read` |
| `POST` | `/rest/v1/observations` | `observations:write` |
| `PATCH` | `/rest/v1/observations?id=eq.<id>` | `observations:write` |
| `GET` | `/rest/v1/observation_items?observation_id=eq.<id>` | `observations:read` |
| `POST` | `/rest/v1/observation_items` | `observations:write` |

---

## 16. Communication (التواصل)

### 16.1 DB Tables

- `public.announcements` — `(id, school_id, title, body, audience, published_at, created_by)`
- `public.notifications` — `(id, school_id, user_id, title, body, kind, read_at)`
- `public.message_log` — `(id, school_id, channel, recipient, template, payload, status, error)`

`audience` format: `all` | `teachers` | `parents` | `students` | `class:<uuid>`

`notifications.kind` values: `attendance`, `grade`, `announcement`, `event`

`message_log.channel` values: `email`, `sms`, `whatsapp`, `push`

`message_log.status` values: `queued`, `sent`, `failed`

### 16.2 Server Actions (planned — `src/features/communication/actions.ts`)

| Function | Signature | Permission | Notes |
|---|---|---|---|
| `createAnnouncement` | `(input) => ActionResult` | `communication:send` | `title` required; `audience` format validated |
| `publishAnnouncement` | `(id) => ActionResult` | `communication:send` | Sets `published_at = now()` |
| `sendMessage` | `(channel, recipients, template, payload) => ActionResult` | `communication:send` | Enqueues rows in `message_log`; actual delivery via Edge Function or webhook |
| `markNotificationRead` | `(id) => ActionResult` | own notification | Sets `read_at = now()` |
| `getMyNotifications` | `() => Notification[]` | authenticated | RLS restricts to `user_id = auth.uid()` |

### 16.3 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/announcements?school_id=eq.<id>&published_at=not.is.null&order=published_at.desc` | Any school member |
| `POST` | `/rest/v1/announcements` | `communication:send` |
| `PATCH` | `/rest/v1/announcements?id=eq.<id>` | `communication:send` |
| `GET` | `/rest/v1/notifications?user_id=eq.<uid>&order=created_at.desc` | Own user |
| `PATCH` | `/rest/v1/notifications?id=eq.<id>` | Own user |
| `GET` | `/rest/v1/message_log?school_id=eq.<id>&order=created_at.desc` | `reports:read` |

**Push Notification Edge Function** (example):

```
POST /functions/v1/send-push
Headers: Authorization: Bearer <service_role>
Body: { user_ids: [...], title: "...", body: "...", kind: "grade" }
```

---

## 17. Finance (المالية)

### 17.1 DB Tables

```
fee_structures  (school_id, name, grade_level_id, academic_year_id, amount)

invoices  (school_id, student_id, academic_year_id, number, total, discount, status, due_date)
   └── invoice_items  (invoice_id, description, amount)
   └── installments   (invoice_id, due_date, amount, paid)

payments  (school_id, invoice_id, amount, method, paid_at, received_by)
```

`invoices.status`: `unpaid` | `partial` | `paid` | `void`

`payments.method`: `cash` | `card` | `transfer` | `knet`

### 17.2 Server Actions (planned — `src/features/finance/actions.ts`)

| Function | Permission | Validation |
|---|---|---|
| `createFeeStructure(input)` | `finance:write` | `name`, `amount > 0`, `academic_year_id` required |
| `createInvoice(student_id, items, due_date?)` | `finance:write` | Items must have `description` and `amount > 0`; total auto-summed |
| `addInstallment(invoice_id, due_date, amount)` | `finance:write` | `amount > 0`, `sum(installments) <= invoice.total` |
| `recordPayment(invoice_id, amount, method)` | `finance:write` | `amount > 0`; auto-updates `invoice.status` |
| `voidInvoice(id)` | `finance:write` | Only if `status != 'paid'` |
| `getStudentFinancials(student_id)` | `finance:read` | Returns invoices + payments for student |

### 17.3 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/invoices?school_id=eq.<id>&status=eq.unpaid&select=*,students(name_ar)` | `finance:read` |
| `GET` | `/rest/v1/invoices?student_id=eq.<id>&select=*,invoice_items(*),installments(*),payments(*)` | `finance:read` |
| `POST` | `/rest/v1/invoices` | `finance:write` |
| `PATCH` | `/rest/v1/invoices?id=eq.<id>` | `finance:write` |
| `POST` | `/rest/v1/payments` | `finance:write` |
| `GET` | `/rest/v1/fee_structures?school_id=eq.<id>` | `finance:read` |
| `GET` | `/rest/v1/installments?invoice_id=eq.<id>&paid=eq.false` | `finance:read` |

---

## 18. Audit Trail (سجل التدقيق)

### 18.1 DB Table: `public.audit_logs`

Key columns: `id` (bigint identity), `school_id`, `user_id`, `user_email`, `action`, `entity`, `entity_id`, `meta` (jsonb), `created_at`.

Indexes: `(school_id, created_at DESC)`, `(entity, entity_id)`.

### 18.2 Usage

`logAudit` (`src/lib/audit.ts`) is called after every successful mutation in server actions:

```ts
await logAudit("student.create", "students", data.id, { name: parsed.data.name_ar })
await logAudit("attendance.save", "attendance_records", null, { class_id, date, count: records.length })
await logAudit("grade.save", "grades", assessment_id)
```

Action naming convention: `<entity>.<verb>` — e.g. `student.create`, `student.update`, `student.archive`, `teacher.create`, `invoice.create`, `payment.record`.

### 18.3 RLS Policy

- **SELECT**: `in_my_school(school_id) AND has_perm('audit:read')`
- **INSERT**: `school_id IS NULL OR in_my_school(school_id)` — any same-school user may append (server actions write here)
- No UPDATE or DELETE policies — the log is append-only by policy design.

### 18.4 REST Equivalents

| Method | Path | Permission |
|---|---|---|
| `GET` | `/rest/v1/audit_logs?school_id=eq.<id>&order=created_at.desc&limit=200` | `audit:read` |
| `GET` | `/rest/v1/audit_logs?entity=eq.students&entity_id=eq.<id>` | `audit:read` |
| `GET` | `/rest/v1/audit_logs?user_id=eq.<uid>&created_at=gte.<from>` | `audit:read` |

---

## 19. External / Mobile Client Guide

This section shows how a Flutter / React Native / third-party client can consume the Madrasati API using Supabase's auto-REST layer.

### 19.1 Authentication Flow

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant Auth as Supabase Auth
    participant DB as PostgREST (RLS)

    App->>Auth: POST /auth/v1/token?grant_type=password<br/>{email, password}
    Auth-->>App: {access_token, refresh_token, expires_in}
    App->>DB: GET /rest/v1/profiles?id=eq.<uid><br/>Authorization: Bearer <access_token>
    DB-->>App: [{id, full_name, role, school_id, ...}]
    Note over App: Store tokens; refresh before expiry
    App->>Auth: POST /auth/v1/token?grant_type=refresh_token<br/>{refresh_token}
    Auth-->>App: {access_token, refresh_token}
```

### 19.2 Required Headers

```
Authorization: Bearer <JWT access_token>
apikey: <anon_key>           # use anon key for client apps
Content-Type: application/json
Accept: application/json
```

For single-object responses add:
```
Accept: application/vnd.pgrst.object+json
Prefer: return=representation
```

### 19.3 Pagination

PostgREST uses offset pagination via the `Range` header:

```
Range: 0-49          # first 50 rows
Range: 50-99         # next 50
```

Response includes `Content-Range: 0-49/312`.

For keyset pagination, combine with `order` and `id=gt.<last_id>`.

### 19.4 Filtering Cheat Sheet

| Goal | Query parameter |
|---|---|
| Exact match | `field=eq.<value>` |
| Not equal | `field=neq.<value>` |
| In list | `field=in.(<a>,<b>,<c>)` |
| Text search | `field=ilike.*<term>*` |
| Date range | `date=gte.<from>&date=lte.<to>` |
| Null check | `field=is.null` / `field=not.is.null` |
| Nested join | `select=*,classes(name)` |
| Deep join | `select=*,student_guardians(*,guardians(*))` |

### 19.5 Realtime Subscriptions

Mobile clients can subscribe to table changes via Supabase Realtime WebSocket:

```
wss://<ref>.supabase.co/realtime/v1/websocket?apikey=<anon>&vsn=1.0.0
```

Useful channels for a student/parent app:

| Event | Table | Filter |
|---|---|---|
| New notification | `notifications` | `user_id=eq.<uid>` |
| Attendance updated | `attendance_records` | `student_id=eq.<id>` |
| New announcement | `announcements` | `school_id=eq.<id>` |
| Grade posted | `grades` | `student_id=eq.<id>` |

### 19.6 Edge Functions

Custom business logic beyond PostgREST is exposed via Supabase Edge Functions (Deno). Planned functions:

| Function | Path | Purpose |
|---|---|---|
| `generate-report-card` | `/functions/v1/generate-report-card` | Compute GPA, rank, build PDF via template |
| `send-push` | `/functions/v1/send-push` | FCM/APNs push to device tokens |
| `send-sms` | `/functions/v1/send-sms` | Twilio/unifonic SMS dispatch |
| `import-students` | `/functions/v1/import-students` | Parse CSV, validate, bulk upsert students |
| `attendance-summary` | `/functions/v1/attendance-summary` | Aggregate stats for a student/class/period |
| `promote-students` | `/functions/v1/promote-students` | End-of-year: create new enrollments, update `current_class_id` |

All Edge Functions receive the client JWT forwarded in `Authorization`; they call `createClient(req)` and operate under the same RLS as the caller.

### 19.7 Permission Matrix Summary

| Role (دور) | Key Permissions |
|---|---|
| `super_admin` (مدير النظام) | `*` — all resources |
| `principal` (مدير المدرسة) | All except `finance:write`, `students:import`, `students:delete` |
| `vice_principal` (وكيل) | Students R/W, classes, attendance, behavior, observations, timetable |
| `department_head` (رئيس قسم) | Students R, teachers R, subjects R/W, curriculum R/W, observations R/W, analytics |
| `teacher` (معلم) | Students R, attendance R/W, grades R/W, curriculum R/W, islamic R/W, behavior R/W |
| `activity_supervisor` (مشرف نشاط) | Students R, activities R/W, attendance R/W |
| `registrar` (مسؤول تسجيل) | Students R/W/import/delete, classes R/W |
| `finance_officer` (مسؤول مالي) | Finance R/W, students R, reports R |
| `auditor` (مدقق) | Audit R, analytics R, reports R |
| `student` (طالب) | Grades R, attendance R, timetable R, activities R |
| `parent` (ولي أمر) | Grades R, attendance R, timetable R, behavior R |

---

*Document generated from migration files `0001`–`0005` and `src/features/students/` reference module. All table names, column names, and permission keys are authoritative as of this writing. Update this document when new migrations are applied.*
