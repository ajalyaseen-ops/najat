-- ============================================================
--  Madrasati ERP — 0004 · Administration, Communication,
--  Certificate/Report templates, Finance (future-ready), Audit.
-- ============================================================

-- ============================================================
--  CERTIFICATE & REPORT DESIGNER
--  Templates are stored as JSON layouts (header/footer/blocks/QR) produced by
--  the drag-and-drop designer; rendered to PDF on demand.
-- ============================================================
create table if not exists public.report_templates (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  name       text not null,
  kind       text not null,   -- report_card | attendance | certificate_quran | achievement | participation
  layout     jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_templates_updated before update on public.report_templates
  for each row execute function public.set_updated_at();

-- ============================================================
--  COMMUNICATION
-- ============================================================
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  title      text not null,
  body       text,
  audience   text not null default 'all',  -- all | teachers | parents | students | class:<id>
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  title      text not null,
  body       text,
  kind       text,                 -- attendance | grade | announcement | event
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on public.notifications(user_id, read_at);

-- Outbound message audit (email / sms / whatsapp / push)
create table if not exists public.message_log (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  channel    text not null check (channel in ('email','sms','whatsapp','push')),
  recipient  text not null,
  template   text,
  payload    jsonb,
  status     text not null default 'queued' check (status in ('queued','sent','failed')),
  error      text,
  created_at timestamptz not null default now()
);

-- ============================================================
--  FINANCE (designed now; UI activated later)
-- ============================================================
create table if not exists public.fee_structures (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  name        text not null,
  grade_level_id uuid references public.grade_levels(id) on delete set null,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  amount      numeric(10,2) not null default 0,
  created_at  timestamptz not null default now()
);
create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  number      text,
  total       numeric(10,2) not null default 0,
  discount    numeric(10,2) not null default 0,
  status      text not null default 'unpaid' check (status in ('unpaid','partial','paid','void')),
  due_date    date,
  created_at  timestamptz not null default now()
);
create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  amount      numeric(10,2) not null default 0
);
create table if not exists public.installments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  due_date    date not null,
  amount      numeric(10,2) not null,
  paid        boolean not null default false
);
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  amount      numeric(10,2) not null,
  method      text,                 -- cash | card | transfer | knet
  paid_at     timestamptz not null default now(),
  received_by uuid references public.profiles(id) on delete set null
);

-- ============================================================
--  AUDIT TRAIL
-- ============================================================
create table if not exists public.audit_logs (
  id         bigint generated always as identity primary key,
  school_id  uuid references public.schools(id) on delete set null,
  user_id    uuid references public.profiles(id) on delete set null,
  user_email text,
  action     text not null,
  entity     text,
  entity_id  text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_school_time_idx on public.audit_logs(school_id, created_at desc);
create index if not exists audit_entity_idx on public.audit_logs(entity, entity_id);
