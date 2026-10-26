-- Additive release schema: user_states remains untouched for rollback.
create table if not exists public.redesigned_workspaces (
  user_id uuid primary key references auth.users(id),
  state jsonb not null check (jsonb_typeof(state) = 'object' and coalesce(state->>'format' = 'workwindow-redesigned', false)),
  revision bigint not null check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.redesigned_workspaces enable row level security;
revoke all on public.redesigned_workspaces from anon;
grant select, insert, update on public.redesigned_workspaces to authenticated;
create policy "Owner reads redesigned workspace" on public.redesigned_workspaces for select to authenticated
  using ((select auth.uid()) = user_id and public.is_current_user_allowed());
create policy "Owner creates redesigned workspace" on public.redesigned_workspaces for insert to authenticated
  with check ((select auth.uid()) = user_id and public.is_current_user_allowed() and revision = 1);
create policy "Owner updates redesigned workspace" on public.redesigned_workspaces for update to authenticated
  using ((select auth.uid()) = user_id and public.is_current_user_allowed())
  with check ((select auth.uid()) = user_id and public.is_current_user_allowed());
create function public.validate_workspace_revision() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.user_id <> old.user_id or new.revision <> old.revision + 1 then
    raise exception 'Workspace revision must advance by one';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.validate_workspace_revision() from public, anon, authenticated;
create trigger validate_workspace_revision before update on public.redesigned_workspaces
  for each row execute function public.validate_workspace_revision();
