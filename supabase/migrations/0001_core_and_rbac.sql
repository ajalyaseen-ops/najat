-- ============================================================
--  Madrasati ERP — 0001 · Core & RBAC
--  Multi-tenant root (schools), profiles, roles/permissions, and the
--  helper functions that every RLS policy relies on.
--  Apply in Supabase: SQL Editor → paste → Run (in filename order).
-- ============================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";      -- case-insensitive email

-- ------------------------------------------------------------
--  updated_at trigger helper
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ============================================================
--  SCHOOLS — the tenant root. Every domain row carries school_id.
-- ============================================================
create table if not exists public.schools (
  id            uuid primary key default gen_random_uuid(),
  name_ar       text not null,
  name_en       text,
  slug          text unique not null,
  logo_url      text,
  secondary_logo_url text,
  stamp_url     text,
  signature_url text,
  login_bg_url  text,
  banner_url    text,
  slogan_ar     text,
  slogan_en     text,
  address       text,
  phone         text,
  email         text,
  website       text,
  principal_name text,
  theme         jsonb,                 -- {"--primary":"218 64% 23%", ...}
  calendar      text not null default 'gregorian' check (calendar in ('gregorian','hijri')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_schools_updated before update on public.schools
  for each row execute function public.set_updated_at();

-- ============================================================
--  ROLES & PERMISSIONS (RBAC)
--  profiles.role holds the user's primary role; role_permissions is the
--  customizable grant matrix. Mirrors src/lib/rbac.ts.
-- ============================================================
create table if not exists public.roles (
  key       text primary key,
  name_ar   text not null,
  name_en   text not null,
  is_system boolean not null default true
);

create table if not exists public.permissions (
  key         text primary key,
  description text
);

create table if not exists public.role_permissions (
  role_key       text not null references public.roles(key) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_key, permission_key)
);

insert into public.roles (key, name_ar, name_en) values
  ('super_admin','مدير النظام','Super Administrator'),
  ('principal','مدير المدرسة','Principal'),
  ('vice_principal','وكيل المدرسة','Vice Principal'),
  ('department_head','رئيس قسم','Department Head'),
  ('teacher','معلم','Teacher'),
  ('activity_supervisor','مشرف نشاط','Activity Supervisor'),
  ('registrar','مسؤول التسجيل','Registrar'),
  ('finance_officer','مسؤول مالي','Finance Officer'),
  ('auditor','مدقق النظام','System Auditor'),
  ('student','طالب','Student'),
  ('parent','ولي أمر','Parent')
on conflict (key) do nothing;

insert into public.permissions (key) values
  ('*'),
  ('students:read'),('students:write'),('students:delete'),('students:import'),
  ('teachers:read'),('teachers:write'),
  ('classes:read'),('classes:write'),
  ('subjects:read'),('subjects:write'),
  ('departments:read'),('departments:write'),
  ('attendance:read'),('attendance:write'),
  ('grades:read'),('grades:write'),
  ('timetable:read'),('timetable:write'),
  ('curriculum:read'),('curriculum:write'),
  ('islamic:read'),('islamic:write'),
  ('behavior:read'),('behavior:write'),
  ('observations:read'),('observations:write'),
  ('activities:read'),('activities:write'),
  ('reports:read'),('communication:send'),('analytics:read'),
  ('finance:read'),('finance:write'),
  ('settings:write'),('branding:write'),('users:manage'),('audit:read')
on conflict (key) do nothing;

-- super_admin → wildcard
insert into public.role_permissions (role_key, permission_key)
  values ('super_admin','*') on conflict do nothing;

-- principal
insert into public.role_permissions (role_key, permission_key)
select 'principal', k from unnest(array[
  'students:read','students:write','teachers:read','teachers:write','classes:read','classes:write',
  'subjects:read','subjects:write','departments:read','departments:write','attendance:read','grades:read',
  'timetable:read','timetable:write','curriculum:read','islamic:read','behavior:read','behavior:write',
  'observations:read','observations:write','activities:read','reports:read','communication:send',
  'analytics:read','settings:write','branding:write','users:manage','audit:read']) k
on conflict do nothing;

-- teacher
insert into public.role_permissions (role_key, permission_key)
select 'teacher', k from unnest(array[
  'students:read','classes:read','subjects:read','attendance:read','attendance:write','grades:read',
  'grades:write','timetable:read','curriculum:read','curriculum:write','islamic:read','islamic:write',
  'behavior:read','behavior:write','communication:send','reports:read']) k
on conflict do nothing;

-- registrar
insert into public.role_permissions (role_key, permission_key)
select 'registrar', k from unnest(array[
  'students:read','students:write','students:import','students:delete','classes:read','classes:write',
  'attendance:read','reports:read']) k
on conflict do nothing;

-- department_head
insert into public.role_permissions (role_key, permission_key)
select 'department_head', k from unnest(array[
  'students:read','teachers:read','classes:read','subjects:read','subjects:write','departments:read',
  'grades:read','curriculum:read','curriculum:write','observations:read','observations:write',
  'reports:read','analytics:read']) k
on conflict do nothing;

-- parent / student (read-only portals)
insert into public.role_permissions (role_key, permission_key)
select 'parent', k from unnest(array['grades:read','attendance:read','timetable:read','behavior:read']) k
on conflict do nothing;
insert into public.role_permissions (role_key, permission_key)
select 'student', k from unnest(array['grades:read','attendance:read','timetable:read','activities:read']) k
on conflict do nothing;

-- ============================================================
--  PROFILES — one row per auth user. Holds role + school binding.
-- ============================================================
create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  email     citext,
  full_name text,
  role      text not null default 'teacher' references public.roles(key),
  avatar_url text,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_school_idx on public.profiles(school_id);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
--  RBAC helper functions (SECURITY DEFINER avoids RLS recursion)
-- ------------------------------------------------------------
create or replace function public.current_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

-- Does the caller's role grant `perm`? super_admin's '*' grants everything.
create or replace function public.has_perm(perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.role_permissions rp
    join public.profiles p on p.id = auth.uid()
    where rp.role_key = p.role
      and (rp.permission_key = perm or rp.permission_key = '*')
  );
$$;

-- Row belongs to the caller's school (or caller is super_admin).
create or replace function public.in_my_school(row_school uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin() or row_school = public.current_school_id();
$$;

-- ------------------------------------------------------------
--  Auto-create a profile on signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'teacher'),
    nullif(new.raw_user_meta_data->>'school_id','')::uuid
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
