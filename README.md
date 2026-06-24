# مدرستي · Madrasati — Enterprise School ERP & Academic Management System

An Arabic-first (RTL), multi-tenant School ERP platform: students, teachers, classes,
attendance, grades, Islamic studies, curriculum coverage, behavior, activities,
observations, communication, finance, AI analytics, and a full reporting/branding suite —
built to scale from one school to a multi-school SaaS.

**Stack:** Next.js 15 (App Router, TypeScript) · TailwindCSS + shadcn-style UI · next-intl
(Arabic default, instant AR⇄EN, RTL) · Supabase (PostgreSQL + Auth/JWT/MFA + Row Level
Security + Storage) · TanStack Query · Recharts · Vitest + Playwright.

> **Why Supabase instead of a self-hosted NestJS/Prisma cluster?** Supabase *is* PostgreSQL,
> and natively provides JWT auth, TOTP MFA, RBAC via Row Level Security, S3-compatible
> storage, realtime, and row-level multi-tenancy — exactly the platform services the spec
> required, without operating a Kubernetes backend. The frontend is exactly as specified
> (Next.js 15 + TS + Tailwind + shadcn + RTL). See [docs/01-system-architecture.md](docs/01-system-architecture.md).

---

## 🚀 Quick start

```bash
# 1) Install
npm install

# 2) Configure environment
cp .env.example .env.local        # fill in your Supabase URL + anon key

# 3) Apply the database (Supabase Dashboard → SQL Editor, in order):
#    supabase/migrations/0001_core_and_rbac.sql
#    supabase/migrations/0002_academic_and_people.sql
#    supabase/migrations/0003_operations.sql
#    supabase/migrations/0004_admin_finance_audit.sql
#    supabase/migrations/0005_rls_policies.sql
#    supabase/seed.sql            # demo school + sample data
#    (or: supabase link && supabase db push)

# 4) Create your login (Auth → Users → Add user, Auto Confirm) and run the
#    "make super admin" snippet at the bottom of supabase/seed.sql.

# 5) Run
npm run dev                        # http://localhost:3000
```

Full step-by-step (storage buckets, Vercel/Netlify, backups): **[docs/17-deployment-guide.md](docs/17-deployment-guide.md)**.

---

## 🧱 What's in this repository

| Area | Location | Status |
|---|---|---|
| Database schema + RLS (all modules) | [`supabase/migrations`](supabase/migrations) | ✅ Complete |
| Seed data (demo school) | [`supabase/seed.sql`](supabase/seed.sql) | ✅ |
| Auth, RBAC, multi-tenant shell | `src/lib`, `src/middleware.ts`, `src/app/(app)/layout.tsx` | ✅ Working |
| Arabic-first RTL + i18n + theming | `src/i18n`, `src/app/globals.css`, `tailwind.config.ts` | ✅ Working |
| Executive dashboard | `src/app/(app)/dashboard` | ✅ Working |
| **Students** (reference CRUD module) | `src/features/students`, `src/app/(app)/students` | ✅ Full CRUD |
| Teachers, Classes, Subjects, Departments, Attendance, Grades | `src/features/*`, `src/app/(app)/*` | ✅ Functional |
| Timetable, Curriculum, Islamic, Behavior, Observations, Activities | `src/app/(app)/*` | ✅ Data-backed |
| **Staffing Plan** (خطة النصاب) — per-department teacher/class period sheet with live load & coverage checks | `src/features/staffing`, `src/app/(app)/staffing` | ✅ Editable |
| Reports, Analytics, Communication, Finance, Users, Branding, Settings, Audit | `src/app/(app)/*` | ✅ Data-backed |
| Design & architecture deliverables (1–20 + security + AI) | [`docs/`](docs) | 📚 Documented |
| Unit + E2E tests | `src/lib/__tests__`, `e2e/` | ✅ Samples + strategy |

This is a **working core foundation + complete design blueprint** — a genuinely runnable v1
of the highest-value modules plus the full architecture for the rest. To add a new module,
copy the **Students** pattern (`schema.ts` → `actions.ts` → table → form) — documented in
[docs/16-source-code-overview.md](docs/16-source-code-overview.md).

---

## 📦 Deliverables index (as requested)

1. [System Architecture](docs/01-system-architecture.md)
2. [Domain-Driven Design](docs/02-domain-driven-design.md)
3. [Database Design](docs/03-database-design.md)
4. [ER Diagram](docs/04-er-diagram.md)
5. [Database Tables](docs/05-database-tables.md)
6. [Relationships](docs/06-relationships.md)
7. [Schema (SQL canonical) + optional Prisma & TS types](docs/07-prisma-and-types.md)
8. [Backend / Data-layer Structure](docs/08-backend-structure.md)
9. [Frontend Structure](docs/09-frontend-structure.md)
10. [API Endpoints](docs/10-api-endpoints.md)
11. [Authentication Flow](docs/11-authentication-flow.md)
12. [RBAC Design](docs/12-rbac-design.md)
13. [UI Wireframes](docs/13-ui-wireframes.md)
14. [Dashboard Design](docs/14-dashboard-design.md)
15. [Page-by-Page Specification](docs/15-page-specifications.md)
16. [Source Code](.) — this repo · [overview](docs/16-source-code-overview.md)
17. [Deployment Guide](docs/17-deployment-guide.md)
18. [Testing Strategy](docs/18-testing-strategy.md)
19. [Scaling Strategy](docs/19-scaling-strategy.md)
20. [Future Expansion Roadmap](docs/20-future-roadmap.md)

Plus: [Security](docs/21-security.md) · [AI Features](docs/22-ai-features.md)

---

## 🗂️ Project structure (top level)

```
ERP System/
├── src/
│   ├── app/
│   │   ├── login/                 # public auth screen
│   │   ├── (app)/                 # authenticated shell (sidebar + topbar)
│   │   │   ├── dashboard/ students/ teachers/ classes/ ... (every module)
│   │   │   └── layout.tsx         # session guard + branding + shell
│   │   ├── layout.tsx             # RTL/lang, fonts, providers
│   │   └── globals.css            # design tokens (navy/green/white)
│   ├── components/{ui,shell,dashboard,auth}/
│   ├── features/<module>/         # schema.ts · actions.ts · table · form
│   ├── lib/                       # supabase, auth, rbac, audit, gpa, dates
│   ├── i18n/  messages/{ar,en}.json
│   └── middleware.ts              # Supabase session refresh + route guard
├── supabase/migrations/*.sql      # schema + RLS (apply in order)
├── supabase/seed.sql
└── docs/                          # the 20+ deliverables
```

## 🔐 Roles

Super Administrator · Principal · Vice Principal · Department Head · Teacher ·
Activity Supervisor · Registrar · Finance Officer · System Auditor · Student · Parent —
each with a configurable permission set (see [docs/12-rbac-design.md](docs/12-rbac-design.md)).

## 🧪 Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run test       # vitest unit tests
npm run test:e2e   # playwright e2e
npm run db:types   # regenerate Supabase TS types (after migrations)
```
