# 13 — UI Wireframes (RTL, Arabic-First)

> **Madrasati** (مدرستي) — Enterprise School ERP & Academic Management System  
> Stack: Next.js 15 App Router · TypeScript · TailwindCSS · shadcn-style UI · next-intl · Supabase

This document captures the canonical wireframe for every primary screen in the system. All layouts are **RTL by default** (Arabic locale). The shell is a fixed sidebar on the right in desktop view; content flows from right to left. Logical CSS properties (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`) are used throughout the codebase instead of physical `left`/`right`.

---

## Conventions

| Symbol | Meaning |
|--------|---------|
| `[BTN]` | Clickable button |
| `[INP]` | Text / date input |
| `[SEL]` | Select / dropdown |
| `[CHK]` | Checkbox |
| `[TBL]` | Data table |
| `[ICO]` | Lucide-react icon |
| `[AVT]` | Avatar / photo |
| `████` | Placeholder image / chart area |
| `░░░░` | Skeleton / loading state |
| `→` | Tab / step transition |
| `//` | Developer note |

Sidebar is always rendered on the **right** in RTL. Content column is on the left of the sidebar.

---

## 1. Login Screen (`/login`)

Backed by `supabase.auth.signInWithPassword`. Reads `schools.login_bg_url`, `schools.logo_url`, `schools.slogan_ar` for per-tenant branding. On success, `requireSession()` (`src/lib/auth.ts`) resolves `profiles.role` and routes accordingly.

```
┌────────────────────────────────────────────────────────────────┐
│  [login_bg_url full-bleed background — 60 % of viewport]       │
│                                                                 │
│  ┌──────────────────────────────────────────────┐              │
│  │  [AVT: school logo_url, centered]             │              │
│  │  ──────────────────────────────────────────  │              │
│  │  مدرستي                   [app.name from ar]  │  ← h2       │
│  │  نظام إدارة المدارس المتكامل                  │  ← tagline  │
│  │                                               │              │
│  │  مرحباً بعودتك              [auth.welcomeBack] │  ← h1       │
│  │  سجّل دخولك للوصول إلى لوحة التحكم            │  ← subtitle │
│  │                                               │              │
│  │  [LABEL: auth.email]                          │              │
│  │  [INP type=email  dir=ltr placeholder=…]     │              │
│  │                                               │              │
│  │  [LABEL: auth.password]                       │              │
│  │  [INP type=password dir=ltr]    [نسيت؟]       │              │
│  │                                               │              │
│  │  [BTN primary full-width: auth.signIn]        │              │
│  │                                               │              │
│  │  ── حدث خطأ (toast/sonner on error) ──        │              │
│  └──────────────────────────────────────────────┘              │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**RTL notes:**
- The card is centered horizontally; internal text aligns right naturally because `<html dir="rtl">`.
- Email/password inputs force `dir="ltr"` so typed text reads left-to-right (as in `student-form.tsx`).
- The "نسيت؟" link sits at `text-start` (physical right in RTL).

**MFA step** (appears when `profiles.must_change_password = true` or TOTP is enrolled):

```
│  [LABEL: auth.mfaTitle]                          │
│  أدخل الرمز من تطبيق المصادقة                    │
│  [INP type=text inputmode=numeric maxlength=6]   │
│  [BTN: auth.verify]                              │
```

**Responsive (mobile):** the background image collapses; the card takes 100 % viewport width with `p-6`.

---

## 2. Application Shell — Sidebar + Topbar

The shell wraps all `(app)` routes via `src/app/(app)/layout.tsx`. The sidebar is the main navigation surface, filtered by `hasPermission(profile.role, item.permission)` (`src/lib/rbac.ts`).

### 2a. Desktop Shell (≥ 1024 px)

```
┌─────────────────────────────┬──────────────────────────────────────────┐
│  SIDEBAR (right, fixed)     │  CONTENT (left, scrollable)              │
│  w-64  bg-sidebar           │  min-h-screen px-6 py-4                  │
│                             │                                          │
│  ┌─────────────────────┐   │  [PageHeader]                            │
│  │ [AVT] مدرستي   [X]  │   │   h1 title  ·  subtitle                 │
│  └─────────────────────┘   │   └─ [children: action buttons]          │
│                             │                                          │
│  ── الشؤون الأكاديمية ──    │  [Page body]                             │
│  [ICO] لوحة التحكم          │   cards / tables / forms                 │
│  [ICO] الطلاب         ●    │                                          │
│  [ICO] المعلمون             │                                          │
│  [ICO] الفصول               │                                          │
│  [ICO] المواد الدراسية      │                                          │
│  [ICO] الأقسام              │                                          │
│                             │                                          │
│  ── العمليات اليومية ──     │                                          │
│  [ICO] الحضور والغياب       │                                          │
│  [ICO] الدرجات              │                                          │
│  [ICO] الجدول الدراسي       │                                          │
│  [ICO] تغطية المنهج         │                                          │
│  [ICO] التربية الإسلامية    │                                          │
│  [ICO] السلوك والانضباط     │                                          │
│  [ICO] الملاحظات الصفية     │                                          │
│  [ICO] الأنشطة والنوادي     │                                          │
│                             │                                          │
│  ── التقارير والتحليلات ──  │                                          │
│  [ICO] التقارير             │                                          │
│  [ICO] التحليلات            │                                          │
│  [ICO] التواصل              │                                          │
│                             │                                          │
│  ── الإدارة ──              │                                          │
│  [ICO] المالية              │                                          │
│  [ICO] المستخدمون           │                                          │
│  [ICO] هوية المدرسة         │                                          │
│  [ICO] الإعدادات            │                                          │
│  [ICO] سجل التدقيق          │                                          │
│                             │                                          │
│  ─────────────────────────  │                                          │
│  [AVT] أحمد العتيبي         │                                          │
│  معلم  · مدرسة النور        │                                          │
│  [BTN ghost: تسجيل الخروج]  │                                          │
└─────────────────────────────┴──────────────────────────────────────────┘
```

Groups come from `NAVIGATION` in `src/lib/navigation.ts`. Group labels use `nav.groups.*` keys from `ar.json`. The active item (●) gets `bg-sidebar-accent text-sidebar-accent-foreground`.

### 2b. Mobile Shell (< 1024 px)

```
┌──────────────────────────────────────────────────┐
│  [ICO hamburger]   مدرستي   [ICO bell 🔔 2]      │  ← topbar h-14
├──────────────────────────────────────────────────┤
│                                                   │
│  [Page content, full width px-4]                  │
│                                                   │
└──────────────────────────────────────────────────┘
│  [ICO home]  [ICO students] [ICO attend] [ICO +] │  ← bottom nav bar
└──────────────────────────────────────────────────┘
```

The hamburger opens an off-canvas drawer sliding in from the right (RTL). The bottom nav bar surfaces the four most-used items for the user's role.

---

## 3. Dashboard (`/dashboard`)

Implemented in `src/app/(app)/dashboard/page.tsx`. Queries `students` (count where `status='enrolled'`), `staff` (count where `status='active'`), `classes` (count where `status='active'`), `attendance_records` (today's `present` vs total).

```
┌──────────────────────────────────────────────────────────────────────┐
│  PageHeader: "لوحة التحكم التنفيذية"  ·  "أهلاً، أحمد"              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ [ICO Cap] │  │ [ICO Usr]│  │ [ICO Sch]│  │[ICO Cal] │            │
│  │ 1,290    │  │   87     │  │   34     │  │  96.2%   │            │
│  │إجمالي الطلاب│ │إجمالي المعلمين│ │الفصول   │  │حضور اليوم│           │
│  │          │  │          │  │          │  │ 1241/1290│            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│  ← StatCard x4, grid 2-col mobile / 4-col lg                        │
│                                                                       │
│  ┌────────────────────────────────────────┐  ┌────────────────────┐ │
│  │  اتجاه الحضور (آخر 6 أيام)            │  │  التسجيل           │ │
│  │  [recharts LineChart / AreaChart]      │  │  [recharts Donut]  │ │
│  │  100%─                                 │  │  ابتدائي 520       │ │
│  │   90%─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─        │  │  متوسط  410       │ │
│  │       السبت الأحد الإثنين … الخميس    │  │  ثانوي  360       │ │
│  └────────────────────────────────────────┘  └────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────┐  ┌────────────────────┐ │
│  │  أداء الأقسام                          │  │ الطلاب المعرضون   │ │
│  │  [recharts BarChart — horizontal]      │  │ للخطر             │ │
│  │  العربية    ████████████ 88           │  │                    │ │
│  │  الرياضيات  ██████████   82           │  │  [skeleton until   │ │
│  │  العلوم     █████████████ 90          │  │   AI model feeds] │ │
│  │  الإنجليزية ███████████  85           │  │                    │ │
│  │  الإسلامية  ██████████████ 93         │  │                    │ │
│  └────────────────────────────────────────┘  └────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Key data flows:**
- `attendance_records.date = todayISO()`, grouped by `status`
- Charts are recharts components in `src/components/dashboard/charts.tsx`

---

## 4. Students List (`/students`)

Implemented in `src/app/(app)/students/page.tsx` + `src/features/students/students-table.tsx`. Requires `students:read` permission. Joins `classes(name)` via `current_class_id`.

```
┌──────────────────────────────────────────────────────────────────────┐
│  PageHeader: "الطلاب"  ·  "إدارة بيانات الطلاب والتسجيل"            │
│                                                     [ICO] تصدير      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────┐               [BTN+] إضافة طالب        │
│  │ [ICO Search]  بحث…       │  (requires students:write)             │
│  └──────────────────────────┘                                         │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  الاسم بالعربية │ الرقم الوزاري │ الفصل │ الجوال │ الحالة │ ⋯ │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  أحمد محمد الزيد│   20250001   │ 1أ   │ 97xxxxxxx│[badge]│ ⋯ │  │
│  │  فاطمة علي      │   20250002   │ 2ب   │ 96xxxxxxx│[badge]│ ⋯ │  │
│  │  خالد سعد       │   20250003   │ 3ج   │ ——       │[badge]│ ⋯ │  │
│  │  …              │             │       │          │       │   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  // Phone/ministry numbers rendered dir="ltr" text-start             │
│  // Status badges: enrolled→success, withdrawn→destructive, etc.     │
│  // ⋯ opens DropdownMenu: [تعديل] [أرشفة]                           │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**RTL column order** (columns flow from right to left in the table header):  
`الاسم بالعربية | الرقم الوزاري | الفصل | الجوال | الحالة | ⋯`

The three-dot menu (`MoreHorizontal`) aligns to `end` (`align="end"` on `DropdownMenuContent`).

---

## 5. Student Form Dialog

Triggered from the `[BTN+] إضافة طالب` or the edit dropdown item. Defined in `src/features/students/student-form.tsx`. Validated by `studentSchema` in `src/features/students/schema.ts`.

```
┌─────────────────── DialogContent max-w-2xl ───────────────────────────┐
│  DialogHeader: "إضافة طالب" / "تعديل بيانات الطالب"                   │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ── Section 1: البيانات الأساسية (grid 2-col) ──                      │
│                                                                        │
│  الاسم بالعربية *        │  الاسم بالإنجليزية          [dir=ltr]      │
│  [INP]                  │  [INP]                                       │
│                         │                                              │
│  الجنس                  │  تاريخ الميلاد                              │
│  [SEL: ذكر / أنثى]      │  [INP type=date]                           │
│                         │                                              │
│  الرقم الوزاري [dir=ltr]│  الرقم المدني   [dir=ltr]                  │
│  [INP]                  │  [INP]                                       │
│                         │                                              │
│  الجنسية                │  الفصل                                      │
│  [INP]                  │  [SEL from classes where status='active']   │
│                         │                                              │
│  ── Section 2: ولي الأمر ──                                           │
│                                                                        │
│  اسم الأب               │  اسم ولي الأمر                              │
│  [INP]                  │  [INP]                                       │
│                         │                                              │
│  رقم الجوال [dir=ltr]   │  guardian email [dir=ltr]                  │
│  [INP]                  │  [INP type=email]                           │
│                         │                                              │
│  ── Section 3: ملاحظات ──                                             │
│                                                                        │
│  ملاحظات طبية                                                         │
│  [INP]                                                                │
│                                                                        │
├───────────────────────────────────────────────────────────────────────┤
│  DialogFooter:                    [BTN outline: إلغاء]  [BTN: حفظ]   │
└───────────────────────────────────────────────────────────────────────┘
```

Fields backed by `students` table columns: `name_ar`, `name_en`, `gender`, `dob`, `ministry_no`, `civil_id`, `nationality`, `current_class_id` (FK → `classes.id`), `father_name`, `guardian_name`, `guardian_mobile`, `guardian_email`, `medical_notes`.

On submit → `createStudent` or `updateStudent` server action → Supabase upsert → `trg_student_class_count` trigger auto-updates `classes.student_count`.

---

## 6. Attendance Grid (`/attendance`)

Daily register backed by `attendance_records(student_id, class_id, date, status, recorded_by)`. Teachers with `attendance:write` can mark rows; `attendance:read` grants view-only.

```
┌──────────────────────────────────────────────────────────────────────┐
│  PageHeader: "الحضور والغياب"                     [BTN] تقرير شهري   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  الفصل: [SEL classes]   التاريخ: [INP date]   [BTN] تعيين الكل حاضر │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  م │ الطالب         │ الحضور                  │ ملاحظة      │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  1 │ أحمد محمد      │ [●حاضر][○غائب][○بعذر][○متأخر][○طبي] │     │  │
│  │  2 │ فاطمة علي      │ [○حاضر][●غائب][○بعذر][○متأخر][○طبي] │[INP]│  │
│  │  3 │ خالد سعد       │ [●حاضر][○غائب][○بعذر][○متأخر][○طبي] │     │  │
│  │  … │ …              │ …                       │             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ملخص: حاضر 28  ·  غائب 3  ·  بعذر 1  ·  متأخر 0  ·  مجموع 32     │
│                                                                       │
│  [BTN primary: حفظ الحضور]                                            │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Status values** (from `attendance_records.status CHECK`):  
`present` · `absent` · `excused` · `late` · `medical`

**Monthly summary view** (toggle): a calendar grid (7 columns × ~5 rows) where each cell is color-coded by `attendance_records.status` for the selected student, showing their full month.

```
┌────────── Monthly Report ──────────────────────────────────────┐
│  الطالب: أحمد محمد    الفصل: 1أ    أيار 2025                  │
│                                                                 │
│  ح   ن   ث   ر   خ   ج   س                                    │
│  ░░  ░░  ░░  ░░  ░░  ░░  ░░                                    │
│  [✓] [✓] [✗] [✓] [✓] [~] [—]                                  │
│  [✓] [✓] [✓] [✓] [✓] [✓] [—]                                  │
│  …                                                              │
│  نسبة الحضور: 94%                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Gradebook / Assessments (`/grades`)

Backed by `assessments` + `grades` tables. Teacher selects a class and subject; the grid shows all students (rows) against all assessments for the term (columns).

```
┌──────────────────────────────────────────────────────────────────────┐
│  PageHeader: "الدرجات والتقييم"                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [SEL الفصل]  [SEL المادة]  [SEL الفصل الدراسي: 1 / 2]              │
│                                                      [BTN+] تقييم جديد│
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │           │ واجب   │ مشاركة │ اختبار │ مشروع  │ نهائي  │مجموع│   │
│  │           │ /10    │ /10    │ /20    │ /20    │ /40    │/100 │   │
│  ├──────────────────────────────────────────────────────────────┤    │
│  │أحمد محمد  │  8     │   9    │  17    │  18    │  35    │ 87  │   │
│  │فاطمة علي  │  9     │   8    │  19    │  17    │  38    │ 91  │   │
│  │خالد سعد   │  6     │   7    │  14    │  15    │  30    │ 72  │   │
│  │…          │        │        │        │        │        │     │   │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  // Cells are [INP type=number min=0] when grades:write, plain text  │
│  // otherwise. Autosaved via debounced PATCH to grades table.        │
│  // مجموع column is computed: Σ(score/max_score × weight).          │
│  // assessment_types.weight drives the formula.                      │
│                                                                       │
│  ── Class Statistics ──                                              │
│  المتوسط: 83.3   الأعلى: 91   الأدنى: 72   الانحراف: 7.8           │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**New Assessment dialog:**
```
┌── إضافة تقييم ──────────────────────────────────────────┐
│  العنوان: [INP]                                         │
│  النوع:   [SEL assessment_types.name_ar]                │
│  الدرجة القصوى: [INP number]     التاريخ: [INP date]   │
│  الفصل الدراسي: [SEL 1 / 2 / 3]                        │
│                              [إلغاء]  [حفظ]             │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Report Card (`/reports/report-card`)

Renders a printed-style card from `report_cards` (snapshot stored in `data JSONB`). Supports school branding (`schools.logo_url`, `schools.stamp_url`, `schools.signature_url`, `schools.principal_name`).

```
┌─────────────────── كشف الدرجات ────────────────────────────────────┐
│                                                                      │
│  [logo_url]                              [secondary_logo_url]       │
│  مدرسة النور الحكومية                                               │
│  العام الدراسي: 2025/2026   الفصل الدراسي: الثاني                   │
│                                                                      │
│  اسم الطالب:   أحمد محمد الزيد             رقم الطالب: 20250001    │
│  الصف:        الثامن "أ"                   التاريخ: 15/5/2025      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  المادة      │ الواجب │ المشاركة │ الاختبار │ النهائي │ المجموع │ │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  اللغة العربية│  9/10 │  8/10   │  18/20  │  36/40  │  71/80│  │
│  │  الرياضيات   │  7/10 │  9/10   │  15/20  │  33/40  │  64/80│  │
│  │  العلوم      │  8/10 │  8/10   │  17/20  │  35/40  │  68/80│  │
│  │  …           │       │         │         │         │       │  │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  المجموع الكلي                                    │  531/640│  │
│  │  النسبة المئوية                                   │  83.0%  │  │
│  │  المعدل التراكمي (GPA)                            │  3.5   │  │
│  │  الترتيب على الفصل                               │  7/32  │  │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ملاحظة المعلم: طالب مجتهد ويُشار إليه بالتميز…                    │
│                                                                      │
│  [stamp_url]               توقيع مدير المدرسة: _____________        │
│                                                                      │
│  [BTN outline: طباعة]  [BTN outline: PDF]  [BTN outline: مشاركة]   │
└──────────────────────────────────────────────────────────────────────┘
```

**Data source:** `report_cards.data JSONB` contains the frozen per-subject breakdown from `grades` joined through `assessments → assessment_types`. `report_cards.gpa`, `.average`, `.rank`, `.term` are top-level indexed columns.

**Generation flow:** A server action iterates all `assessments` for the class/subject/term, looks up `grades.score`, applies `assessment_types.weight`, maps the percentage to `grade_scales` (letter + GPA), then writes a single `report_cards` row per student.

---

## 9. Parent Portal (role = `parent`)

Parents authenticate via Supabase Auth. Their `profiles.role = 'parent'` and they are linked to students via `student_guardians(guardian_id, student_id, relation, is_primary)`. RLS on `attendance_records`, `grades`, and `behavior_records` enforces read-only access scoped to the parent's children.

Permissions granted: `grades:read`, `attendance:read`, `timetable:read`, `behavior:read`.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [TOPBAR] مدرستي                    [ICO bell]  [AVT: guardian name] │
├───────────┬──────────────────────────────────────────────────────────┤
│  SIDEBAR  │  CONTENT                                                  │
│ (narrow)  │                                                           │
│           │  [TABS: أحمد · فاطمة]   ← each child via student_guardians│
│  لوحتي   │                                                           │
│  حضور    │  ┌──────────────────────────────────────────────────────┐ │
│  الدرجات │  │  ملخص أحمد محمد الزيد  ·  الثامن "أ"              │ │
│  الجدول  │  │                                                      │ │
│  السلوك  │  │ حضور الأسبوع:  ████████████░░░ 92%                 │ │
│           │  │ آخر 3 درجات:  الرياضيات 85 · العربية 78 · علوم 91│ │
│           │  │ آخر حدث سلوكي: شكر وتقدير — 12/5/2025            │ │
│           │  └──────────────────────────────────────────────────────┘ │
│           │                                                           │
│           │  ── الحضور الشهري ──                                     │
│           │  [Calendar grid, read-only, color-coded]                  │
│           │                                                           │
│           │  ── الدرجات ──                                           │
│           │  [Table: subject | assessment | score | max | %]          │
│           │  (same gradebook data, read-only)                         │
│           │                                                           │
│           │  ── الجدول الدراسي ──                                    │
│           │  [Timetable grid — see §11]                               │
│           │                                                           │
│           │  ── الإشعارات ──                                         │
│           │  [List of notifications.title where user_id = guardian]   │
└───────────┴──────────────────────────────────────────────────────────┘
```

**RLS enforcement:** `student_guardians` links the guardian to their students. The RLS policy on `attendance_records` checks `student_id IN (SELECT sg.student_id FROM student_guardians sg JOIN guardians g ON g.id = sg.guardian_id WHERE g.profile_id = auth.uid())`.

---

## 10. Teacher Portal (role = `teacher`)

Teachers have `attendance:write`, `grades:write`, `behavior:write`, `curriculum:write`, and read access to their assigned classes. The teaching_assignments table (`staff_id`, `class_id`, `subject_id`) defines what data they can touch.

```
┌──────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (full nav, filtered)    │  CONTENT                          │
│  [الشؤون الأكاديمية filtered]    │                                   │
│  [العمليات اليومية: full]        │  PageHeader: "لوحة التحكم"        │
│                                  │  أهلاً، نورة الزيد  ·  معلمة     │
│                                  │                                   │
│                                  │  ┌────────┐ ┌────────┐ ┌──────┐  │
│                                  │  │فصولي   │ │حصصي   │ │طلابي │  │
│                                  │  │  3     │ │  12   │ │  89  │  │
│                                  │  └────────┘ └────────┘ └──────┘  │
│                                  │                                   │
│                                  │  ── جدولي اليوم ──               │
│                                  │  الحصة 1 · 8:00–8:45  ← 1أ رياضيات│
│                                  │  الحصة 2 · 8:50–9:35  ← 2ب رياضيات│
│                                  │  الحصة 3 · استراحة                │
│                                  │  …                                │
│                                  │                                   │
│                                  │  ── رصد الحضور السريع ──         │
│                                  │  [SEL فصل]  [BTN: ابدأ الرصد]    │
│                                  │                                   │
│                                  │  ── آخر التقييمات ──             │
│                                  │  [mini table: title · class · date]│
└──────────────────────────────────────────────────────────────────────┘
```

**Quick attendance flow** from this dashboard shortcuts to `/attendance` pre-filtered for the teacher's class.

---

## 11. Timetable Grid (`/timetable`)

Backed by `timetable_slots(class_id, period_id, day_of_week, subject_id, staff_id, room_id)`. `periods` defines time bands; `day_of_week` is 0 (Sunday) – 6 (Saturday), matching the Gulf school week (Sun–Thu).

```
┌──────────────────────────────────────────────────────────────────────┐
│  PageHeader: "الجدول الدراسي"                                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [SEL الفصل: 1أ]  [SEL العام الدراسي]  [BTN: تعديل] [BTN: طباعة]   │
│                                                                       │
│  // RTL: days column headers read right to left: خميس…أحد           │
│                                                                       │
│  ┌──────────────┬──────────┬──────────┬──────────┬──────────┬──────┐ │
│  │ الحصة        │  الأحد   │  الإثنين │ الثلاثاء │ الأربعاء │الخميس│ │
│  ├──────────────┼──────────┼──────────┼──────────┼──────────┼──────┤ │
│  │ 1· 8:00–8:45 │ رياضيات │ عربية   │ علوم    │ رياضيات │ إنجل.│ │
│  │              │ أ.نورة  │ أ.سالم  │ أ.مريم  │ أ.نورة  │ أ.جون│ │
│  ├──────────────┼──────────┼──────────┼──────────┼──────────┼──────┤ │
│  │ 2· 8:50–9:35 │ عربية   │ إسلامية │ رياضيات │ علوم    │ عربية│ │
│  ├──────────────┼──────────┼──────────┼──────────┼──────────┼──────┤ │
│  │ استراحة 9:35 │          BREAK (20 min)                           │ │
│  ├──────────────┼──────────┼──────────┼──────────┼──────────┼──────┤ │
│  │ 3· 9:55–10:40│ إسلامية │ رياضيات │ إنجليزية│ عربية   │ علوم │ │
│  │ …            │ …        │ …        │ …        │ …        │ …    │ │
│  └──────────────┴──────────┴──────────┴──────────┴──────────┴──────┘ │
│                                                                       │
│  // Edit mode: each cell becomes a popover with [SEL subject]        │
│  //  [SEL staff] [SEL room]. Unique constraint on                     │
│  //  (staff_id, period_id, day_of_week) prevents teacher conflicts.  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Teacher view:** same grid filtered by `teaching_assignments.staff_id = me`, read-only.  
**Mobile view:** collapses to a day-picker at the top; shows a vertical list of that day's periods.

---

## 12. Islamic Studies / Quran Memorization (`/islamic`)

Backed by `quran_memorization(student_id, surah_number → quran_surahs, from_ayah, to_ayah, status, score, tajweed_score)` and `quran_revisions`.

```
┌──────────────────────────────────────────────────────────────────────┐
│  PageHeader: "التربية الإسلامية"                   [BTN+] إضافة سورة │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [TABS: الحفظ | المراجعة | الإحصائيات]                               │
│                                                                       │
│  ── TAB: الحفظ ──                                                    │
│                                                                       │
│  [SEL فصل]  [SEL طالب]                                              │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  السورة      │ الآيات     │ الحالة       │ الدرجة │ التجويد  │  │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  الفاتحة (1) │ 1–7        │ [محفوظ ✓]   │  95%   │   98%    │  │ │
│  │  البقرة (2)  │ 1–50       │ [قيد التحفيظ]│  72%   │   80%    │  │ │
│  │  البقرة (2)  │ 51–100     │ [لم يبدأ]   │  ——    │   ——     │  │ │
│  │  آل عمران (3)│ 1–20       │ [لم يبدأ]   │  ——    │   ——     │  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  // Status badge colours: memorized→green, in_progress→amber,       │
│  // not_started→muted                                                │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 13. Behavior & Discipline (`/behavior`)

Backed by `behavior_records(student_id, kind, category, description, action_taken, points, date, recorded_by)`.

```
┌──────────────────────────────────────────────────────────────────────┐
│  PageHeader: "السلوك والانضباط"                [BTN+] إضافة تسجيل   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [TABS: الإيجابي ✨ | السلبي ⚠ | الكل]                              │
│  [SEL فصل]  [SEL طالب]  [INP from date]  [INP to date]             │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  الطالب      │ النوع     │ الفئة       │ التاريخ │ النقاط │ ⋯ │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  أحمد محمد  │ [●إيجابي]│ قيادة       │ 14/5   │  +5    │ ⋯ │  │
│  │  فاطمة علي  │ [●إيجابي]│ تفوق        │ 12/5   │  +10   │ ⋯ │  │
│  │  خالد سعد   │ [○سلبي]  │ تنبيه       │ 10/5   │  -3    │ ⋯ │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Add Record dialog:**
```
┌── إضافة تسجيل سلوكي ──────────────────────────────────┐
│  الطالب: [SEL]                 الفصل: [SEL]           │
│  النوع:  [●إيجابي  ○سلبي]                             │
│  الفئة:  [SEL: قيادة / تفوق / تنبيه / مخالفة / ...]  │
│  الوصف:  [TEXTAREA]                                   │
│  الإجراء المتخذ: [TEXTAREA]                           │
│  النقاط: [INP number]           التاريخ: [INP date]  │
│                            [إلغاء]  [حفظ]             │
└────────────────────────────────────────────────────────┘
```

---

## 14. Mobile Layout

All pages use Tailwind responsive prefixes (`sm:`, `lg:`). Key breakpoint behaviors:

```
┌─────────────── < 640px (mobile) ───────────────────────┐
│  [hamburger ≡]   مدرستي    [bell 🔔]                   │
├────────────────────────────────────────────────────────┤
│                                                         │
│  [PageHeader: h1 text-xl]                              │
│  [Action btn: icon-only or short label]                 │
│                                                         │
│  [StatCards: 2-col grid]                               │
│  ┌────────┐  ┌────────┐                                │
│  │ 1290   │  │  87    │                                │
│  │طلاب    │  │معلمون  │                                │
│  └────────┘  └────────┘                                │
│  ┌────────┐  ┌────────┐                                │
│  │  34    │  │ 96.2%  │                                │
│  │فصول    │  │حضور    │                                │
│  └────────┘  └────────┘                                │
│                                                         │
│  [Charts: full width, reduced height 200px]            │
│                                                         │
│  [Tables: horizontal scroll container, sticky col 1]   │
│                                                         │
│  [Dialogs: full screen (max-h-[100dvh] rounded-none)]  │
│                                                         │
└────────────────────────────────────────────────────────┘
│  [Home][Students][Attend][+]                           │  ← bottom nav
└────────────────────────────────────────────────────────┘
```

**Table responsiveness:** On mobile, the students table wraps inside a `overflow-x-auto` container. Non-essential columns (nationality, enrollment date) are hidden with `hidden sm:table-cell`. The `DropdownMenu` trigger remains visible in the `end` column.

**Attendance grid on mobile:** The status radio buttons collapse into a single-tap badge that cycles through statuses: `حاضر → غائب → بعذر → متأخر → طبي → حاضر`.

**Dialog on mobile:** `DialogContent` receives `sm:max-w-2xl` class; on `< sm` it takes `100vw 100dvh` and forms stack into single column.

---

## 15. RTL Mirroring Checklist

The following decisions enforce correct RTL rendering throughout the app.

| UI Element | RTL Behaviour | Implementation |
|---|---|---|
| Sidebar | Fixed to **right** edge | `right-0` or flexbox with `dir="rtl"` root |
| Page content | Flows **right → left** | `<html dir="rtl">` via next-intl |
| Tables | Column headers read R→L | Natural with `dir="rtl"` |
| Search icon | Inside input at **start** | `start-3` (logical, = right in RTL) |
| Dropdown | Aligns to `end` (right in RTL) | `align="end"` on `DropdownMenuContent` |
| Phone / ministry numbers | Force `dir="ltr"` | `dir="ltr" className="text-start"` on `<TableCell>` |
| Email inputs | Force `dir="ltr"` | `dir="ltr"` on `<Input>` |
| Dates (Hijri / Gregorian) | Controlled by `schools.calendar` | `src/lib/dates.ts` |
| Icon placement | Logical (`ms-2`, `me-2`) | Never `ml-`, `mr-` |
| Charts (recharts) | `layout="vertical"` bars flip correctly; axis labels in Arabic | `src/components/dashboard/charts.tsx` |
| Timetable column order | Days listed R→L (خميس ... أحد) | CSS `dir` inheritance |
| Form grid | Two-column with correct gutters | `grid gap-4 sm:grid-cols-2` (direction-agnostic) |
| Buttons in footer | Primary on **left** (end of RTL reading) | `DialogFooter` uses `flex-row-reverse` implicitly |
| Breadcrumbs | Separator `›` becomes `‹` in RTL | CSS `transform: scaleX(-1)` on separator |
| Toasts (sonner) | Appear at `bottom-start` (= bottom-right in RTL) | Sonner `position="bottom-right"` (logical equivalent) |

---

## 16. Component Architecture Diagram

```mermaid
graph TD
    subgraph Shell
        L[layout.tsx<br/>app/&#40;app&#41;]
        SB[Sidebar<br/>NAVIGATION filtered by role]
        TH[Topbar &#40;mobile&#41;]
    end

    subgraph Pages
        D[/dashboard]
        S[/students]
        A[/attendance]
        G[/grades]
        R[/reports/report-card]
        PP[/portal - parent]
        TP[/teacher-dashboard]
        TT[/timetable]
        IS[/islamic]
        BH[/behavior]
    end

    subgraph Features
        SF[students/students-table.tsx<br/>students/student-form.tsx<br/>students/schema.ts<br/>students/actions.ts]
    end

    subgraph UI
        PH[PageHeader]
        SC[StatCard]
        CH[Charts &#40;recharts&#41;]
        DP[Dialog / Form]
        TB[Table]
        BD[Badge]
    end

    subgraph Data
        SB2[(Supabase<br/>Postgres + RLS)]
        TQ[TanStack Query<br/>&#40;client mutations&#41;]
    end

    L --> SB
    L --> TH
    L --> Pages

    D --> SC
    D --> CH
    S --> SF
    SF --> TB
    SF --> DP
    A --> TB
    G --> TB
    R --> PH

    Pages --> PH
    Pages --> UI

    SF --> TQ
    TQ --> SB2
    Pages --> SB2
```

---

## 17. Key Screen–Table Mapping

| Screen | Primary Table(s) | Key Columns |
|---|---|---|
| Login | `profiles`, `schools` | `profiles.role`, `schools.login_bg_url`, `schools.logo_url` |
| Dashboard | `students`, `staff`, `classes`, `attendance_records` | `students.status='enrolled'`, `attendance_records.date`, `attendance_records.status` |
| Students List | `students`, `classes` | `students.*`, `students.current_class_id → classes.name` |
| Student Form | `students` | All columns from `studentSchema` |
| Attendance Grid | `attendance_records` | `student_id`, `class_id`, `date`, `status`, `recorded_by` |
| Gradebook | `assessments`, `grades`, `assessment_types` | `assessments.class_id/subject_id/term`, `grades.score`, `assessment_types.weight/max_score` |
| Report Card | `report_cards`, `schools` | `report_cards.data JSONB`, `schools.stamp_url`, `schools.signature_url` |
| Parent Portal | `student_guardians`, `attendance_records`, `grades`, `notifications` | `student_guardians.guardian_id`, RLS-scoped reads |
| Teacher Portal | `teaching_assignments`, `timetable_slots`, `attendance_records` | `teaching_assignments.staff_id`, `timetable_slots.day_of_week/period_id` |
| Timetable | `timetable_slots`, `periods`, `rooms` | `timetable_slots.(class_id, period_id, day_of_week)` UNIQUE |
| Islamic Studies | `quran_memorization`, `quran_surahs`, `quran_revisions` | `surah_number`, `status`, `score`, `tajweed_score` |
| Behavior | `behavior_records` | `kind`, `category`, `points`, `recorded_by` |
| Report Templates | `report_templates` | `kind`, `layout JSONB` |
| Audit Log | `audit_logs` | `action`, `entity`, `entity_id`, `user_email`, `created_at` |
