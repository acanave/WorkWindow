-- Fresh private deployments only. Existing deployments must preserve their access policies.
create table public.allowed_auth_emails (
  email text primary key check (email = lower(email))
);
alter table public.allowed_auth_emails enable row level security;
revoke all on public.allowed_auth_emails from anon, authenticated;

-- Owner-scoped policies call this narrow helper; clients cannot read the allowlist.
create function public.is_current_user_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    join public.allowed_auth_emails a on a.email = lower(u.email)
    where u.id = (select auth.uid())
  );
$$;
revoke all on function public.is_current_user_allowed() from public, anon;
grant execute on function public.is_current_user_allowed() to authenticated;
-- Provision the intended Auth user and insert their lowercase email as an administrator.
-- No personal emails or credentials belong in this file.
