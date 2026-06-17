# 19 · Scaling Strategy

**Madrasati ERP — Arabic-first multi-tenant school management platform**

This document describes how the system scales from a single school pilot to a regional deployment spanning thousands of students, hundreds of teachers, and dozens of campuses — without a rewrite. It covers Postgres performance, connection management, caching, CDN, edge compute, rate limiting, data archiving, and multi-tenancy evolution.

---

## Table of Contents

1. [Scale Targets](#1-scale-targets)
2. [Database Layer](#2-database-layer)
   - 2.1 Existing Indexes Review
   - 2.2 Missing Critical Indexes (add now)
   - 2.3 Attendance Partitioning
   - 2.4 Audit Log Partitioning
   - 2.5 Query Patterns & Optimizer Hints
3. [Connection Pooling — Supavisor](#3-connection-pooling--supavisor)
4. [Read Replicas](#4-read-replicas)
5. [Caching Strategy](#5-caching-strategy)
   - 5.1 React Server Component Cache
   - 5.2 TanStack Query (Client)
   - 5.3 Postgres `pg_stat_statements` & Materialized Views
6. [Supabase Storage & CDN](#6-supabase-storage--cdn)
7. [Edge Functions](#7-edge-functions)
8. [Rate Limiting](#8-rate-limiting)
9. [Pagination](#9-pagination)
10. [Academic Year Archiving](#10-academic-year-archiving)
11. [Multi-School Tenancy](#11-multi-school-tenancy)
    - 11.1 Current Model — Shared Schema + RLS
    - 11.2 Schema-Per-Tenant
    - 11.3 Database-Per-Tenant
    - 11.4 Decision Matrix
12. [Multi-Campus Architecture](#12-multi-campus-architecture)
13. [Operational Runbook Checklist](#13-operational-runbook-checklist)

---

## 1. Scale Targets

| Dimension | Pilot | Year-2 Target | Year-5 Target |
|---|---|---|---|
| Schools (مدارس) | 1–3 | 20–50 | 200+ |
| Students per school (طلاب) | 300–500 | 1,000–2,000 | 3,000–5,000 |
| Total students | ~1,000 | ~40,000 | ~500,000 |
| Staff per school (معلمون) | 30–50 | 100–200 | 500+ |
| `attendance_records` rows / year | ~200 K | ~8 M | ~100 M |
| `grades` rows / year | ~50 K | ~2 M | ~25 M |
| `audit_logs` rows / year | ~100 K | ~5 M | ~50 M |
| Concurrent sessions (peak) | 50 | 500 | 5,000 |

---

## 2. Database Layer

### 2.1 Existing Indexes Review

The migrations already create the following relevant indexes:

```sql
-- 0002_academic_and_people.sql
profiles_school_idx          ON profiles(school_id)
staff_school_idx             ON staff(school_id)
staff_dept_idx               ON staff(department_id)
grade_levels_stage_idx       ON grade_levels(stage_id)
classes_year_idx             ON classes(academic_year_id)
classes_grade_idx            ON classes(grade_level_id)
students_school_idx          ON students(school_id)
students_class_idx           ON students(current_class_id)
students_status_idx          ON students(status)
students_ministry_uq         ON students(school_id, ministry_no) WHERE ministry_no IS NOT NULL
enroll_student_idx           ON student_enrollments(student_id)

-- 0003_operations.sql
att_class_date_idx           ON attendance_records(class_id, date)
att_school_date_idx          ON attendance_records(school_id, date)
assess_class_subject_idx     ON assessments(class_id, subject_id)
grades_student_idx           ON grades(student_id)
quran_student_idx            ON quran_memorization(student_id)
behavior_student_idx         ON behavior_records(student_id)

-- 0004_admin_finance_audit.sql
notif_user_idx               ON notifications(user_id, read_at)
audit_school_time_idx        ON audit_logs(school_id, created_at DESC)
audit_entity_idx             ON audit_logs(entity, entity_id)
```

These are sufficient for the pilot. The gaps below become critical at Year-2 scale.

### 2.2 Missing Critical Indexes (add now)

Apply as a new migration `0006_perf_indexes.sql`:

```sql
-- attendance_records: teacher loads "today's class" — needs school + date + class
CREATE INDEX CONCURRENTLY IF NOT EXISTS att_school_class_date_idx
  ON public.attendance_records(school_id, class_id, date DESC);

-- attendance_records: student-portal loads own history
CREATE INDEX CONCURRENTLY IF NOT EXISTS att_student_date_idx
  ON public.attendance_records(student_id, date DESC);

-- grades: report card generation joins assessments across a year/term
CREATE INDEX CONCURRENTLY IF NOT EXISTS grades_assessment_student_idx
  ON public.grades(assessment_id, student_id);

-- students: name search (registrar search box)
CREATE INDEX CONCURRENTLY IF NOT EXISTS students_name_ar_trgm_idx
  ON public.students USING gin(name_ar gin_trgm_ops);
-- requires: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- behavior_records: date-range queries per school
CREATE INDEX CONCURRENTLY IF NOT EXISTS behavior_school_date_idx
  ON public.behavior_records(school_id, date DESC);

-- audit_logs: user-level audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_user_time_idx
  ON public.audit_logs(user_id, created_at DESC);

-- notifications: unread count (very frequent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS notif_user_unread_idx
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- quran_memorization: per-student overview
CREATE INDEX CONCURRENTLY IF NOT EXISTS quran_student_surah_idx
  ON public.quran_memorization(student_id, surah_number);

-- student_enrollments: per-year roster export
CREATE INDEX CONCURRENTLY IF NOT EXISTS enroll_year_class_idx
  ON public.student_enrollments(academic_year_id, class_id);
```

Use `CONCURRENTLY` on a live database so the index build does not lock the table.

### 2.3 Attendance Partitioning

`attendance_records` is the highest-write table: one row per student per school day. At 5,000 students × 200 school days = 1 million rows/year per school. With 200 schools that is 200 M rows in 5 years.

**Strategy: range partition by `date` (year).**

```sql
-- Migration 0007_partition_attendance.sql
-- Step 1: rename existing table
ALTER TABLE public.attendance_records RENAME TO attendance_records_legacy;

-- Step 2: create partitioned parent (identical columns)
CREATE TABLE public.attendance_records (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id    uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date        date NOT NULL,
  status      text NOT NULL CHECK (status IN ('present','absent','excused','late','medical')),
  note        text,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
) PARTITION BY RANGE (date);

-- Step 3: create yearly partitions (automate via pg_cron or migration job)
CREATE TABLE attendance_records_2024
  PARTITION OF public.attendance_records
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE attendance_records_2025
  PARTITION OF public.attendance_records
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE attendance_records_2026
  PARTITION OF public.attendance_records
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Step 4: recreate indexes on the parent (Postgres 11+ propagates to partitions)
CREATE INDEX att_class_date_idx       ON public.attendance_records(class_id, date);
CREATE INDEX att_school_date_idx      ON public.attendance_records(school_id, date DESC);
CREATE INDEX att_school_class_date_idx ON public.attendance_records(school_id, class_id, date DESC);
CREATE INDEX att_student_date_idx     ON public.attendance_records(student_id, date DESC);

-- Step 5: migrate data from legacy table
INSERT INTO public.attendance_records SELECT * FROM public.attendance_records_legacy;
DROP TABLE public.attendance_records_legacy;

-- Step 6: re-enable RLS (policies must be re-applied on the parent)
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
-- re-apply the att_*_sel / att_*_ins / att_*_upd / att_*_del policies from 0005_rls_policies.sql
```

**Partition pruning** means a query for "today's class" only scans the current year's ~1 M rows, not the full 200 M. Planner eliminates other partitions automatically when `date` is in the `WHERE` clause.

**Automation:** create a `pg_cron` job (Supabase supports `pg_cron` natively) to provision next year's partition each August 1:

```sql
SELECT cron.schedule(
  'create-attendance-partition',
  '0 0 1 8 *',   -- 1 August every year
  $$
  DO $$
  DECLARE
    yr     int := EXTRACT(year FROM now())::int + 1;
    tbl    text := 'attendance_records_' || yr;
    lo     text := yr || '-01-01';
    hi     text := (yr+1) || '-01-01';
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = tbl) THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF public.attendance_records FOR VALUES FROM (%L) TO (%L)',
        tbl, lo, hi);
    END IF;
  END;
  $$
  $$
);
```

### 2.4 Audit Log Partitioning

`audit_logs` uses a `bigint generated always as identity` primary key — ideal for append-only time-series. Partition by month once it exceeds ~5 M rows:

```sql
-- Range partition by created_at (monthly for audit, yearly for attendance)
-- Same pattern as §2.3; omitted for brevity.
-- Old partitions (> 7 years) can be DETACHED and cold-stored to S3 via pg_dump.
```

The existing `audit_school_time_idx ON audit_logs(school_id, created_at DESC)` ensures each school's admin loads their tail quickly even before partitioning.

### 2.5 Query Patterns & Optimizer Hints

| Hot Query | Table | Key Columns | Recommendation |
|---|---|---|---|
| "Today's absent students" | `attendance_records` | `school_id, date, status` | Covered by `att_school_date_idx` |
| "Student name search" | `students` | `school_id, name_ar` | Add `gin_trgm_ops` index (§2.2) |
| "Report card generation" | `grades`, `assessments` | `assessment_id, student_id` | Batch by class; avoid N+1 |
| "Unread notification count" | `notifications` | `user_id, read_at IS NULL` | Partial index (§2.2) |
| "Class roster for teacher" | `students` + `classes` | `current_class_id, status` | Already indexed; limit 1000 sufficient |
| "Year-end academic summary" | `grades` + `assessments` + `report_cards` | `school_id, academic_year_id` | Use materialized view (§5.3) |

For the students page (`/src/app/(app)/students/page.tsx`), the current hard `.limit(1000)` is fine for a single school. At 5,000 students per school, switch to cursor-based pagination (§9).

---

## 3. Connection Pooling — Supavisor

Supabase provides **Supavisor** as its managed PgBouncer-compatible pooler. All application connections should go through the pooler URL, not the direct Postgres URL.

### Current Setup

`src/lib/supabase/server.ts` connects via `NEXT_PUBLIC_SUPABASE_URL` which already routes through the Supabase API layer (PostgREST + Supavisor). Direct Postgres connections (e.g., in Prisma or raw `pg`) must use the pooler port.

### Configuration Recommendations

```
# .env (server-side only — never exposed to browser)
# Transaction mode pooler (for stateless server actions / Route Handlers)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Session mode (for migrations, long-running queries, LISTEN/NOTIFY)
DATABASE_URL_SESSION=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

| Mode | Port | Use Case |
|---|---|---|
| Transaction mode | 6543 | Server Actions, API routes, all short queries |
| Session mode | 5432 | Migrations (`supabase db push`), bulk imports via `createAdminClient()` |

### Pool Sizing

Supabase Free/Pro plans expose a fixed max_connections (typically 60–200). Supavisor multiplexes thousands of application connections to these slots.

- **Next.js on Vercel** spawns many serverless functions. Each uses a short-lived transaction-mode connection → Supavisor amortizes them efficiently.
- Set `max_connections` in the Supabase Dashboard → Settings → Database. Target: `(reserved_superuser=3) + (pooler_default=15) + (direct_app=5)` for Pro plan.
- For `createAdminClient()` in `src/lib/supabase/server.ts` (service-role, bypasses RLS), always use it sparingly — it holds a session-mode slot for the duration of the request.

### Flow Diagram

```mermaid
graph LR
    subgraph Vercel["Vercel Edge / Serverless"]
        SC[Server Component]
        SA[Server Action]
        RH[Route Handler]
    end
    subgraph Supabase
        SV[Supavisor\nTransaction Pool]
        PG[(Postgres\nPrimary)]
        RR[(Read Replica\nfuture)]
    end

    SC -->|anon/service key| SV
    SA -->|anon/service key| SV
    RH -->|anon/service key| SV
    SV -->|write| PG
    SV -->|read| RR
```

---

## 4. Read Replicas

Supabase supports **read replicas** (Postgres physical streaming replication) on the Pro/Team plan.

### When to Enable

Enable a read replica when:
- The primary CPU regularly exceeds 60% during school hours (8:00–12:00 Gulf time).
- Attendance dashboard queries cause lock contention during morning entry rush.
- Year-end report card generation (heavy `grades` + `assessments` joins) degrades write performance.

### Routing Strategy

Route read-only queries to the replica connection string. The cleanest way in this codebase:

```ts
// src/lib/supabase/server.ts — extended version
export async function createReadClient() {
  const cookieStore = await cookies();
  const url = process.env.SUPABASE_READ_REPLICA_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return createServerClient<Database>(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
}
```

Server Components that only read data (like `/src/app/(app)/students/page.tsx`) use `createReadClient()`; Server Actions that write use `createClient()` (primary). Since RSC caches are cleared by `revalidatePath`, there is a brief replication lag window (typically < 1 s on Supabase) — acceptable for ERP workflows.

### Replication Lag Consideration

For `attendance_records` written by a teacher and immediately re-read by the same teacher, keep those reads on the primary. Only route aggregate/report queries to the replica.

---

## 5. Caching Strategy

### 5.1 React Server Component Cache

Next.js 15 App Router caches `fetch()` and `unstable_cache` calls per-request and per-deployment.

**Per-request deduplication** is already in use: `src/lib/auth.ts` wraps `getSessionProfile` in React's `cache()`:

```ts
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => { … });
```

This means the profile + school lookup is executed once per request regardless of how many layouts and pages import it.

**Segment-level caching** for slow-changing data:

```ts
// Timetable slots change rarely — cache for 1 hour
const getTimetable = unstable_cache(
  async (schoolId: string, classId: string) => { … },
  ['timetable'],
  { revalidate: 3600, tags: [`timetable:${schoolId}`] }
);

// Academic year list — changes rarely; invalidate on settings:write
const getAcademicYears = unstable_cache(
  async (schoolId: string) => { … },
  ['academic_years'],
  { revalidate: 86400, tags: [`school:${schoolId}`] }
);
```

Use `revalidateTag('timetable:' + schoolId)` inside the Server Action that saves a timetable slot.

**Do NOT cache:**
- `attendance_records` — teachers write and immediately re-read. Use `export const dynamic = "force-dynamic"` on the attendance page (already the pattern in `students/page.tsx`).
- Any page reading `notifications` — must be fresh per user.

### 5.2 TanStack Query (Client)

TanStack Query is declared in the stack. Use it for interactive client panels where the user expects live-ish data:

| Data | `staleTime` | `gcTime` | Refetch Trigger |
|---|---|---|---|
| Student list (browsing) | 5 min | 30 min | `students:write` mutation |
| Attendance day view | 30 s | 5 min | After save |
| Notifications bell | 30 s | 5 min | Focus/visibilitychange |
| Dashboard analytics | 10 min | 60 min | Manual refresh |
| Timetable | 60 min | 120 min | Timetable mutation |

For attendance entry (the highest-frequency write), optimistic updates eliminate perceived latency:

```ts
useMutation({
  mutationFn: saveAttendance,
  onMutate: async (newRecord) => {
    await queryClient.cancelQueries({ queryKey: ['attendance', classId, date] });
    const prev = queryClient.getQueryData(['attendance', classId, date]);
    queryClient.setQueryData(['attendance', classId, date], (old) =>
      old.map(r => r.student_id === newRecord.student_id ? { ...r, ...newRecord } : r)
    );
    return { prev };
  },
  onError: (_err, _vars, ctx) => queryClient.setQueryData(['attendance', classId, date], ctx?.prev),
});
```

### 5.3 Materialized Views for Analytics

Year-end and cross-class analytics are expensive joins. Create materialized views refreshed nightly:

```sql
-- 0008_materialized_views.sql

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_student_attendance_summary AS
SELECT
  ar.school_id,
  ar.student_id,
  date_trunc('month', ar.date) AS month,
  COUNT(*) FILTER (WHERE ar.status = 'present') AS present_days,
  COUNT(*) FILTER (WHERE ar.status = 'absent')  AS absent_days,
  COUNT(*) FILTER (WHERE ar.status = 'late')    AS late_days,
  COUNT(*) AS total_days
FROM public.attendance_records ar
GROUP BY ar.school_id, ar.student_id, date_trunc('month', ar.date);

CREATE UNIQUE INDEX mv_att_summary_uq
  ON public.mv_student_attendance_summary(school_id, student_id, month);

-- Refresh nightly at 02:00 (after school hours in Gulf timezone UTC+3 → 23:00 UTC)
SELECT cron.schedule('refresh-att-summary', '0 23 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_student_attendance_summary$$);
```

Dashboard analytics pages use `mv_student_attendance_summary` instead of scanning `attendance_records` live.

---

## 6. Supabase Storage & CDN

The `schools` table stores file URLs in columns: `logo_url`, `secondary_logo_url`, `stamp_url`, `signature_url`, `login_bg_url`, `banner_url`. The `students` table has `photo_url`. The `profiles` table has `avatar_url`.

### Bucket Strategy

| Bucket | Files | Access | Max Size |
|---|---|---|---|
| `school-assets` | Logos, banners, stamps, signatures | Public (read) | 2 MB |
| `student-photos` | Student ID photos | Authenticated (school-scoped) | 1 MB |
| `report-pdfs` | Generated report cards / certificates | Authenticated (school-scoped) | 10 MB |
| `imports` | CSV import staging files | Authenticated (uploader-only) | 50 MB |

### CDN Configuration

Supabase Storage automatically fronts with a CDN (Cloudflare) for public buckets. For `school-assets`:

1. Upload logo → get public URL: `https://<ref>.supabase.co/storage/v1/object/public/school-assets/<school_id>/logo.png`
2. This URL is cached at Cloudflare edge POPs (Gulf region: Dubai, Riyadh nodes).
3. Store the URL in `schools.logo_url` — served from CDN, not origin on every page render.

**Cache-busting:** When a school updates their logo, append a `?v=<timestamp>` query or use a versioned filename `logo-v2.png`. The old URL stays cached but new pages serve the new URL.

### Student Photos at Scale

At 5,000 students per school × 200 schools = 1 M photos at ~200 KB each = ~200 GB. Use Supabase Storage with:
- Image transform on-the-fly via `?width=80&height=80&resize=cover` (Supabase Image Transformations) — no manual thumbnail generation needed.
- Private bucket with signed URLs for student photos; signed URL TTL = 1 hour.

### Report PDFs

Generated report cards (populated from `report_cards.data` JSONB + `report_templates.layout` JSONB) should be:
1. Generated server-side (Supabase Edge Function or Next.js Route Handler using a PDF library).
2. Uploaded once to `report-pdfs/<school_id>/<academic_year_id>/<student_id>-term<N>.pdf`.
3. Served via short-lived signed URL, not regenerated on every download.

---

## 7. Edge Functions

Use Supabase Edge Functions (Deno/TypeScript, deployed globally) for compute that must run close to the user or that runs on a schedule without an HTTP trigger.

### Recommended Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `send-notification` | DB webhook on `attendance_records` INSERT where `status = 'absent'` | Push / WhatsApp / SMS to guardian_mobile |
| `generate-report-card` | HTTP (called from Next.js Route Handler) | Render PDF from `report_cards` + `report_templates` |
| `bulk-promote-students` | HTTP (called from admin action, end of year) | Move all `student_enrollments` to next `academic_year_id` |
| `sync-sms` | Cron (pg_cron) every 5 min | Flush `message_log` rows in `queued` status to SMS gateway |

**Why Edge Functions instead of Next.js Route Handlers for notifications?**
- DB webhooks fire directly from Supabase — no cold-start round-trip to Vercel.
- Guardian notifications for 5,000 absent students must fan out in < 10 s during morning rush; a queue + edge function handles this better than a synchronous API route.

### `send-notification` skeleton

```ts
// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  const record = await req.json(); // attendance_records row from DB webhook
  if (record.status !== 'absent') return new Response('skip', { status: 200 });

  const { data: student } = await adminClient
    .from('students')
    .select('name_ar, guardian_mobile, school_id')
    .eq('id', record.student_id)
    .single();

  // Log to message_log; actual send via WhatsApp/SMS provider
  await adminClient.from('message_log').insert({
    school_id: student.school_id,
    channel: 'whatsapp',
    recipient: student.guardian_mobile,
    template: 'absence_notify',
    payload: { student_name: student.name_ar, date: record.date },
    status: 'queued',
  });

  return new Response('queued', { status: 200 });
});
```

---

## 8. Rate Limiting

### API Layer

Next.js Route Handlers and Server Actions have no built-in rate limiting. Add it at two levels:

**Level 1 — Vercel Edge Middleware** (before the request hits Node):

```ts
// src/middleware.ts — extend the existing Supabase auth middleware
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 req/min per IP
});

export async function middleware(request: NextRequest) {
  // ... existing Supabase session refresh ...

  // Rate-limit heavy write paths
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    if (!success) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  return response;
}
```

**Level 2 — Supabase Auth rate limits** (built-in): Supabase already enforces per-IP limits on `/auth/v1/token` (login). For a school with 500 simultaneous teacher logins at 08:00, the default limits are sufficient. If a cluster of schools shares one Supabase project, raise the Auth rate-limit in Dashboard → Auth → Rate Limits.

### Per-School Resource Limits

Prevent one school from dominating shared DB resources. Enforce in Server Actions:

```ts
// Example: block bulk imports > 2,000 rows
if (rows.length > 2000) {
  return { ok: false, error: "import_too_large" }; // i18n key
}
```

For heavy reports (year-end analytics covering all students), queue them as background jobs rather than blocking the HTTP request.

---

## 9. Pagination

The current students page uses `.limit(1000)` which is fine for small schools but breaks at 5,000+ students.

### Cursor-Based Pagination (recommended for large lists)

```ts
// Server Component or Server Action
const PAGE_SIZE = 50;

// First page
const { data, error } = await supabase
  .from('students')
  .select('id, name_ar, name_en, status, current_class_id, classes:current_class_id(name)')
  .eq('school_id', profile.schoolId)
  .eq('status', 'enrolled')
  .order('name_ar', { ascending: true })
  .limit(PAGE_SIZE);

// Next page (cursor = last row's name_ar + id for stable sort)
const { data } = await supabase
  .from('students')
  .select('…')
  .or(`name_ar.gt.${cursor.name_ar},and(name_ar.eq.${cursor.name_ar},id.gt.${cursor.id})`)
  .order('name_ar').order('id')
  .limit(PAGE_SIZE);
```

### Offset Pagination (simpler for small datasets)

Acceptable up to ~10,000 rows. PostgREST supports `range` header:

```ts
const from = page * PAGE_SIZE;
const { data, count } = await supabase
  .from('students')
  .select('…', { count: 'exact' })
  .range(from, from + PAGE_SIZE - 1)
  .order('name_ar');
```

### Search with Trigram Index

The `gin_trgm_ops` index on `students.name_ar` (§2.2) enables fast Arabic name search:

```ts
.ilike('name_ar', `%${query}%`) // PostgREST uses ILIKE; trigram index speeds it up
```

### Tables That Need Pagination Now

| Table | Trigger Threshold | Priority |
|---|---|---|
| `students` | > 500 rows | High |
| `attendance_records` (history view) | > 200 rows/page | High |
| `grades` (gradebook) | > 60 students/class | Medium |
| `audit_logs` | Always paginate | High |
| `notifications` | > 50 unread | Medium |

---

## 10. Academic Year Archiving

The `academic_years` table uses the `is_current` boolean with a unique partial index:

```sql
-- 0002_academic_and_people.sql
CREATE UNIQUE INDEX IF NOT EXISTS academic_years_current_uq
  ON public.academic_years(school_id) WHERE is_current;
```

This ensures exactly one current year per school at all times. At year-end:

### Year-End Promotion Flow

```mermaid
sequenceDiagram
    actor Admin as مدير المدرسة (Principal)
    participant App as Next.js Server Action
    participant DB as Postgres

    Admin->>App: "Start new academic year 2026/2027"
    App->>DB: BEGIN
    App->>DB: INSERT academic_years (new row, is_current=false)
    App->>DB: UPDATE academic_years SET is_current=false WHERE school_id=X AND is_current=true
    App->>DB: UPDATE academic_years SET is_current=true WHERE id=new_year_id
    App->>DB: INSERT student_enrollments (copy current enrollment → new year)
    App->>DB: UPDATE students SET current_class_id=NULL WHERE status='graduated'
    App->>DB: UPDATE students SET status='archived' WHERE status='withdrawn' AND updated_at < 1 year ago
    App->>DB: COMMIT
    App->>Admin: Done — new year active
```

### Archiving Old Data

Old academic years' operational data should be kept in-place (for audit and report re-printing) but excluded from active queries by always filtering on `academic_year_id` or by checking `students.status`.

For deep archiving (> 7 years), detach attendance partitions:

```sql
-- Detach the 2019 partition from the live table
ALTER TABLE public.attendance_records DETACH PARTITION attendance_records_2019;

-- Export to cold storage
-- pg_dump -t attendance_records_2019 -Fc > attendance_2019.dump
-- Upload dump to Supabase Storage bucket "cold-archive" or S3

-- Drop the detached table from Postgres to reclaim space
DROP TABLE attendance_records_2019;
```

The data remains recoverable from the dump file; the live database stays lean.

### `audit_logs` Retention

`audit_logs` uses `bigint generated always as identity` — natural for time-windowed archiving:

```sql
-- Archive rows older than 3 years to a cold table
CREATE TABLE IF NOT EXISTS public.audit_logs_archive (LIKE public.audit_logs INCLUDING ALL);

INSERT INTO public.audit_logs_archive
  SELECT * FROM public.audit_logs WHERE created_at < now() - interval '3 years';

DELETE FROM public.audit_logs WHERE created_at < now() - interval '3 years';
```

Schedule via `pg_cron` annually.

---

## 11. Multi-School Tenancy

### 11.1 Current Model — Shared Schema + RLS (now)

All tables live in `public` schema. Every domain row carries a `school_id uuid NOT NULL REFERENCES schools(id)`. Tenant isolation is enforced by:

1. **`current_school_id()`** — SECURITY DEFINER SQL function reading `profiles.school_id` for `auth.uid()`.
2. **`in_my_school(row_school uuid)`** — returns `true` if `row_school = current_school_id()` OR caller is `super_admin`.
3. **RLS policies** on every table call `in_my_school(school_id)`. See `0005_rls_policies.sql`.
4. **Application layer** (`requireSession()` in `src/lib/auth.ts`) adds a second check; but DB is the authoritative boundary.

**Pros:**
- Zero operational overhead — one Supabase project.
- Shared connection pool is used efficiently.
- `super_admin` role has cross-school visibility for support and analytics.
- Schema migrations apply to all tenants simultaneously.

**Cons:**
- A bug in an RLS policy could leak data across schools (mitigated by CI tests and the double-check in Server Actions).
- One noisy school can contend for Postgres resources.
- Cannot give a school a custom Postgres version/extension.

**Scale ceiling:** ~200 schools × 5,000 students = 1 M student rows; ~100 M attendance rows (with partitioning). This is well within Supabase Pro plan and a well-indexed Postgres 15 instance.

### 11.2 Schema-Per-Tenant

Each school gets its own Postgres schema (`school_<slug>`) within the same database. The shared schema (`public`) holds only `schools`, `profiles`, `roles`, `permissions`.

```
public.schools         ← school registry
public.profiles        ← auth bindings (school_id foreign key)
school_riyadh.students ← tenant data
school_jeddah.students ← tenant data
```

**Pros:**
- Complete data isolation without RLS complexity.
- Schema-level pg_dump for per-tenant backup/restore.
- Each school can have a custom grade scale or additional columns.

**Cons:**
- Requires Supabase connection string to set `search_path=school_<slug>` per request — complex with the SSR client in `src/lib/supabase/server.ts`.
- Migrations must be applied N times (one per schema) — tooling complexity.
- PostgREST (which Supabase uses) has limited multi-schema support; requires exposing each schema or using a proxy.
- `super_admin` cross-school queries require dynamic SQL or views.

**Trigger:** consider this if regulatory compliance (e.g., data residency requirements for a Gulf Ministry) mandates hard schema separation per school.

### 11.3 Database-Per-Tenant

Each school gets its own Supabase project (database). The parent platform manages a registry of project refs.

```
madrasati-registry.supabase.co   ← school registry (name, ref, slug)
riyadh-school.supabase.co        ← school A
jeddah-school.supabase.co        ← school B
```

**Pros:**
- Total isolation — billing, backups, compute, connections all separate.
- A school's data never touches another school's database.
- Supabase project-level rate limits are per-school.

**Cons:**
- High operational cost: 200 schools × Supabase Pro = significant monthly cost.
- Each deployment of the Next.js app must route to the correct project URL per session.
- Schema migrations require a CI job that iterates all project refs.
- `super_admin` cross-school analytics require a data warehouse (BigQuery / Redshift / ClickHouse) fed by each project.

**Trigger:** use this model only for very large schools with dedicated SLAs, data sovereignty agreements, or if a school is acquired/resold independently.

### 11.4 Decision Matrix

```mermaid
flowchart TD
    A[Number of schools?] --> B{≤ 200 schools}
    A --> C{201–2000 schools}
    A --> D{> 2000 schools}

    B --> E[Shared schema + RLS\n✓ Current architecture]
    C --> F{Regulatory isolation\nrequired?}
    F -->|No| E
    F -->|Yes| G[Schema-per-tenant]
    D --> H[Database-per-tenant\n+ Data warehouse]
```

**Recommendation:** stay on shared-schema RLS through Year-5 (200+ schools). The architecture is proven, operational cost is minimal, and the `in_my_school()` + `has_perm()` helper pair provides a robust two-factor isolation gate at the DB level.

Invest in the schema-per-tenant migration path only when a regulatory or contractual requirement forces it. Prepare by:
1. Keeping all schema migrations idempotent and scripted.
2. Ensuring no code ever hardcodes `public.` schema prefix (use `search_path`).
3. Documenting the per-school slug convention (`school_<slug>`) now.

---

## 12. Multi-Campus Architecture

A single school (`schools` row) may operate multiple physical campuses (مجمعات مدرسية). The current schema supports this via:

- `classes.school_id` + `rooms.school_id` — campuses share classes/rooms in the same `school_id` namespace.
- `staff.school_id` — teachers belong to a school, assignable to any class.

### Adding Campus Support (migration)

```sql
-- 0009_campuses.sql
CREATE TABLE IF NOT EXISTS public.campuses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name_ar    text NOT NULL,
  name_en    text,
  address    text,
  phone      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campuses_school_idx ON public.campuses(school_id);

-- Add campus_id to classes and rooms (nullable for backward compat)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS campus_id uuid REFERENCES public.campuses(id) ON DELETE SET NULL;
ALTER TABLE public.rooms   ADD COLUMN IF NOT EXISTS campus_id uuid REFERENCES public.campuses(id) ON DELETE SET NULL;
ALTER TABLE public.staff   ADD COLUMN IF NOT EXISTS campus_id uuid REFERENCES public.campuses(id) ON DELETE SET NULL;

CREATE INDEX classes_campus_idx ON public.classes(campus_id);
```

Multi-campus RLS: all campuses of a school share the same `school_id`, so `in_my_school(school_id)` continues to work unchanged. Campus filtering (e.g., a vice-principal who manages only campus B) is done at the application layer by scoping queries to `campus_id` based on the user's profile metadata (add `campus_id` to `profiles` as an optional constraint).

---

## 13. Operational Runbook Checklist

Use this checklist before launching each major scale milestone.

### Before 1,000 students / school

- [ ] All indexes from §2.2 applied (`0006_perf_indexes.sql`)
- [ ] Supavisor transaction-mode URL in `DATABASE_URL`
- [ ] `students/page.tsx` switched from `.limit(1000)` to paginated query
- [ ] `pg_trgm` extension enabled; `students_name_ar_trgm_idx` created
- [ ] Supabase Storage buckets configured with correct public/private settings
- [ ] Rate limiting middleware active on `/api/` routes

### Before 5,000 students / school or 50 schools

- [ ] Attendance partitioned by year (`0007_partition_attendance.sql`)
- [ ] `pg_cron` job for auto-provisioning next year's partition
- [ ] Materialized view `mv_student_attendance_summary` created and cron refresh scheduled
- [ ] Read replica provisioned and `createReadClient()` used for analytics pages
- [ ] Edge Function `send-notification` deployed and DB webhook configured
- [ ] Year-end promotion workflow scripted and tested in staging
- [ ] Load test: simulate 500 concurrent attendance submissions

### Before 200+ schools

- [ ] Audit log archiving cron job scheduled
- [ ] `schools` table index on `slug` exists (already `UNIQUE`)
- [ ] `super_admin` analytics moved to materialized views / separate reporting DB
- [ ] Connection pool sizing reviewed against Supabase plan's `max_connections`
- [ ] Campus table migration applied if any school is multi-campus
- [ ] Schema migration CI pipeline can apply to all tenant schemas (if schema-per-tenant adopted)
- [ ] Incident response runbook for RLS policy bug (immediate: revoke anon key, re-deploy with fix)

---

*Document version: 1.0 — 2026-06-17*
*References: migrations `0001`–`0005`, `src/lib/auth.ts`, `src/lib/rbac.ts`, `src/lib/audit.ts`, `src/lib/supabase/server.ts`, `src/features/students/actions.ts`*
