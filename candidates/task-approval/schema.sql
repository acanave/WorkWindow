-- INACTIVE candidate. Never applied by app startup, build, or CI to a hosted database.
-- Requires the existing personal-access.sql and redesigned-workspaces.sql schemas.
begin;
create schema ww_approval;
revoke all on schema ww_approval from public;
create table ww_approval.grant_config (
  singleton boolean primary key default true check (singleton),
  owner_id uuid not null references auth.users(id),
  project_id text not null,
  token_hash bytea not null check (octet_length(token_hash) = 32),
  enabled boolean not null default false,
  expires_at timestamptz not null
);
create table ww_approval.proposals (
  id uuid primary key,
  owner_id uuid not null,
  request_key text not null,
  request jsonb not null,
  proposal jsonb not null,
  digest text not null,
  status text not null default 'pending' check (status in ('pending','committed','cancelled')),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  committed_at timestamptz,
  receipt jsonb,
  unique(owner_id, request_key)
);
alter table ww_approval.grant_config enable row level security;
alter table ww_approval.proposals enable row level security;
revoke all on all tables in schema ww_approval from public, anon, authenticated;

-- Single transaction: the grant lock serializes requests for this one-owner integration.
-- Ordinary browser saves still use the existing workspace revision trigger/CAS.
create function ww_approval.dispatch(action text, body jsonb, token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g ww_approval.grant_config%rowtype;
  p ww_approval.proposals%rowtype;
  w public.redesigned_workspaces%rowtype;
  owner_ok boolean;
  broker_ok boolean;
  stamp timestamptz;
  day_start timestamptz;
  project jsonb;
  item jsonb;
  meta jsonb;
  patch jsonb;
  before_value jsonb;
  after_value jsonb;
  proposal jsonb;
  task_id text;
  proposal_id uuid;
  index_number integer;
  source_name text;
  operation text;
  total integer;
begin
  if action is null or action not in ('prepare','read','approve','cancel')
     or body is null or jsonb_typeof(body) <> 'object' or octet_length(body::text) > 12000 then
    raise exception 'invalid_request';
  end if;
  select * into g from ww_approval.grant_config where singleton for update;
  stamp := clock_timestamp();
  if not found or not g.enabled or g.expires_at <= stamp then raise exception 'integration_disabled'; end if;
  -- Check current eligibility from authoritative tables, never editable JWT metadata.
  if not exists (select 1 from auth.users u join public.allowed_auth_emails a
      on a.email = lower(u.email) where u.id = g.owner_id) then
    raise exception 'access_denied';
  end if;
  owner_ok := coalesce(auth.uid() = g.owner_id, false);
  broker_ok := coalesce(length(token) between 32 and 512 and
    sha256(convert_to(token, 'UTF8')) = g.token_hash, false);
  if action in ('approve','cancel') then
    if not owner_ok then raise exception 'owner_confirmation_required'; end if;
  elsif action = 'prepare' then
    if not broker_ok then raise exception 'access_denied'; end if;
  elsif not (owner_ok or broker_ok) then raise exception 'access_denied';
  end if;

  if action <> 'prepare' then
    if (body - array['id','digest']) <> '{}'::jsonb
       or jsonb_typeof(body->'id') is distinct from 'string' then raise exception 'invalid_request'; end if;
    select * into p from ww_approval.proposals where id = (body->>'id')::uuid and owner_id = g.owner_id for update;
    if not found then raise exception 'proposal_not_found'; end if;
    if p.proposal->>'projectId' is distinct from g.project_id then raise exception 'grant_changed'; end if;
    if action = 'read' then
      return jsonb_build_object('proposal',p.proposal,'digest',p.digest,'status',
        case when p.status = 'pending' and p.expires_at <= stamp then 'expired' else p.status end,'receipt',p.receipt);
    end if;
    if body->>'digest' is distinct from p.digest then raise exception 'proposal_changed'; end if;
    if p.status = 'committed' then return p.receipt; end if;
    if p.status <> 'pending' or p.expires_at <= stamp then raise exception 'proposal_not_pending'; end if;
    if action = 'cancel' then
      update ww_approval.proposals set status = 'cancelled' where id = p.id;
      return jsonb_build_object('id',p.id,'status','cancelled');
    end if;
    if p.proposal->>'projectId' is distinct from g.project_id then raise exception 'grant_changed'; end if;
  end if;

  select * into w from public.redesigned_workspaces where user_id = g.owner_id for update;
  if not found or w.state->>'format' is distinct from 'workwindow-redesigned'
    or w.state->'version' is distinct from '4'::jsonb then raise exception 'unsupported_workspace'; end if;
  foreach source_name in array array['projects','workItems','done','notes','events','todos','workWindows'] loop
    if jsonb_typeof(w.state->source_name) is distinct from 'array' then raise exception 'unsupported_workspace'; end if;
  end loop;
  if jsonb_typeof(w.state->'taskMeta') is distinct from 'object' then raise exception 'unsupported_workspace'; end if;
  select count(*) into total from jsonb_array_elements(w.state->'projects') v where v->>'id' = g.project_id;
  if total <> 1 then raise exception 'project_not_unique'; end if;
  select v into project from jsonb_array_elements(w.state->'projects') v where v->>'id' = g.project_id;
  if jsonb_typeof(project->'title') is distinct from 'string' or length(btrim(project->>'title')) = 0 then raise exception 'invalid_project'; end if;
  select count(*) into total from jsonb_array_elements(w.state->'projects') v where v->>'title' = project->>'title';
  if total <> 1 then raise exception 'project_not_unique'; end if;
  day_start := date_trunc('day', stamp at time zone 'America/Chicago') at time zone 'America/Chicago';

  if action = 'prepare' then
    if (body - array['requestKey','operation','projectId','taskId','patch']) <> '{}'::jsonb
      or jsonb_typeof(body->'requestKey') is distinct from 'string'
      or length(body->>'requestKey') not between 1 and 128
      or body->>'projectId' is distinct from g.project_id
      or body->>'operation' is null or body->>'operation' not in ('create','update') then raise exception 'invalid_request'; end if;
    select * into p from ww_approval.proposals where owner_id = g.owner_id and request_key = body->>'requestKey';
    if found then
      if p.request <> body then raise exception 'idempotency_conflict'; end if;
      return jsonb_build_object('proposal',p.proposal,'digest',p.digest,'status',
        case when p.status = 'pending' and p.expires_at <= stamp then 'expired' else p.status end,'receipt',p.receipt);
    end if;
    if exists(select 1 from ww_approval.proposals where owner_id = g.owner_id and status = 'pending' and expires_at > stamp) then
      raise exception 'pending_proposal_exists';
    end if;
    if (select count(*) from ww_approval.proposals where owner_id = g.owner_id and created_at >= day_start) >= 10 then
      raise exception 'daily_prepare_limit';
    end if;
    operation := body->>'operation';
    patch := body->'patch';
    if jsonb_typeof(patch) is distinct from 'object' or patch = '{}'::jsonb
      or (patch - array['title','description']) <> '{}'::jsonb then raise exception 'invalid_patch'; end if;
    if patch ? 'title' and (jsonb_typeof(patch->'title') <> 'string'
      or length(btrim(patch->>'title')) not between 1 and 200) then raise exception 'invalid_title'; end if;
    if patch ? 'description' and (jsonb_typeof(patch->'description') <> 'string'
      or length(patch->>'description') > 4000) then raise exception 'invalid_description'; end if;
    if operation = 'create' then
      if body ? 'taskId' or not (patch ? 'title') then raise exception 'invalid_request'; end if;
      task_id := gen_random_uuid()::text;
      before_value := 'null'::jsonb;
      after_value := jsonb_build_object('id',task_id,'title',patch->>'title','description',coalesce(patch->>'description',''),
        'project',project->>'title','status','Backlog');
    else
      if jsonb_typeof(body->'taskId') is distinct from 'string' then raise exception 'invalid_request'; end if;
      task_id := body->>'taskId';
      select count(*) into total from jsonb_array_elements(w.state->'workItems') v where v->>'id' = task_id;
      if total <> 1 then raise exception 'unsupported_task'; end if;
      select v into item from jsonb_array_elements(w.state->'workItems') v where v->>'id' = task_id;
      foreach source_name in array array['done','notes','events','todos'] loop
        if exists(select 1 from jsonb_array_elements(w.state->source_name) v where v->>'id' = task_id) then raise exception 'unsupported_task'; end if;
      end loop;
      -- Linked calendar records need a broader domain operation; deliberately excluded initially.
      if exists(select 1 from jsonb_array_elements(w.state->'workWindows') v where v->>'itemId' = task_id) then raise exception 'unsupported_task'; end if;
      meta := coalesce(w.state->'taskMeta'->task_id,'{}'::jsonb);
      if jsonb_typeof(meta) <> 'object' or coalesce(meta->>'project',item->>'project') is distinct from project->>'title'
        or coalesce(meta->>'status',item->>'status','Done') not in ('Backlog','Ready','In progress')
        or item->>'status' = 'Done' then raise exception 'unsupported_task'; end if;
      before_value := jsonb_build_object('id',task_id,'title',item->>'title',
        'description',coalesce(meta->>'description',item->>'description',''),
        'project',project->>'title','status',coalesce(meta->>'status',item->>'status'));
      after_value := before_value || patch;
      if before_value = after_value then raise exception 'no_change'; end if;
    end if;
    proposal_id := gen_random_uuid();
    proposal := jsonb_build_object('schemaVersion',1,'id',proposal_id,'ownerId',g.owner_id,
      'projectId',g.project_id,'projectTitle',project->>'title','operation',operation,
      'taskId',task_id,'source','workItems','patch',patch,'before',before_value,'after',after_value,
      'expectedRevision',w.revision,'expiresAt',stamp + interval '10 minutes');
    if octet_length(proposal::text) > 8000 then raise exception 'proposal_too_large'; end if;
    insert into ww_approval.proposals(id,owner_id,request_key,request,proposal,digest,expires_at)
      values(proposal_id,g.owner_id,body->>'requestKey',body,proposal,
        encode(sha256(convert_to(proposal::text,'UTF8')),'hex'),stamp + interval '10 minutes') returning * into p;
    return jsonb_build_object('proposal',p.proposal,'digest',p.digest,'status',p.status,'receipt',p.receipt);
  end if;

  -- Approval accepts only the saved proposal ID and digest, never a replacement patch.
  if w.revision <> (p.proposal->>'expectedRevision')::bigint
    or project->>'title' is distinct from p.proposal->>'projectTitle' then raise exception 'stale_proposal'; end if;
  if (select count(*) from ww_approval.proposals where owner_id = g.owner_id and committed_at >= day_start) >= 5 then
    raise exception 'daily_write_limit';
  end if;
  task_id := p.proposal->>'taskId';
  if p.proposal->>'operation' = 'create' then
    w.state := jsonb_set(w.state,'{workItems}',(w.state->'workItems') || jsonb_build_array(p.proposal->'after'));
  else
    select (ordinality - 1)::integer into index_number from jsonb_array_elements(w.state->'workItems') with ordinality
      where value->>'id' = task_id;
    if index_number is null then raise exception 'stale_proposal'; end if;
    patch := p.proposal->'patch';
    w.state := jsonb_set(w.state,array['workItems',index_number::text],(w.state->'workItems'->index_number) || patch);
    w.state := jsonb_set(w.state,array['taskMeta',task_id],coalesce(w.state->'taskMeta'->task_id,'{}'::jsonb) || patch);
  end if;
  update public.redesigned_workspaces set state = w.state, revision = w.revision + 1 where user_id = g.owner_id;
  update ww_approval.proposals set status = 'committed', committed_at = stamp,
    receipt = jsonb_build_object('id',p.id,'status','committed','taskId',task_id,'revision',w.revision + 1,'digest',p.digest)
    where id = p.id returning receipt into proposal;
  return proposal;
end;
$$;
revoke all on function ww_approval.dispatch(text,jsonb,text) from public, anon, authenticated;
-- Private schema must NOT be added to PostgREST's exposed schemas.
-- These execution rights permit the invoker wrapper; table access remains denied.
grant usage on schema ww_approval to anon, authenticated;
grant execute on function ww_approval.dispatch(text,jsonb,text) to anon, authenticated;
create function public.workwindow_task_approval(action text, body jsonb, token text default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select ww_approval.dispatch(action,body,token);
$$;
revoke all on function public.workwindow_task_approval(text,jsonb,text) from public;
grant execute on function public.workwindow_task_approval(text,jsonb,text) to anon, authenticated;
commit;
