-- ============================================================
--  Madrasati ERP — 0006 · Security hardening
--  Addresses Supabase database-linter findings after 0001–0005.
--  (RLS-helper functions current_school_id/has_perm/in_my_school/is_super_admin
--   intentionally remain EXECUTE-able: RLS policies evaluate them as the caller,
--   so revoking would break authorization. They only read the caller's own
--   identity via auth.uid(), so they expose nothing.)
-- ============================================================

-- Belt-and-suspenders: ensure RLS is on for the finance child tables
-- (these are the last statements in 0005 and can be missed if that migration
--  is applied through a tool that truncates the tail).
alter table public.invoice_items enable row level security;
drop policy if exists ii_all on public.invoice_items;
create policy ii_all on public.invoice_items for all to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and public.in_my_school(i.school_id) and public.has_perm('finance:read')))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.in_my_school(i.school_id) and public.has_perm('finance:write')));

alter table public.installments enable row level security;
drop policy if exists inst_all on public.installments;
create policy inst_all on public.installments for all to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and public.in_my_school(i.school_id) and public.has_perm('finance:read')))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.in_my_school(i.school_id) and public.has_perm('finance:write')));

-- Pin search_path on the updated_at helper.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Trigger-only SECURITY DEFINER functions: not meant to be API-callable.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.refresh_class_count() from public, anon, authenticated;
