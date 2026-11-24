-- Additive, on-request read for the existing single-project broker grant.
begin;
create function public.workwindow_project_review(token text, review_day date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  g ww_approval.grant_config%rowtype;
  w public.redesigned_workspaces%rowtype;
  project_name text;
  matches integer;
  day_requested date := coalesce(review_day, (now() at time zone 'America/Chicago')::date);
  today date := (now() at time zone 'America/Chicago')::date;
  source_name text;
  result jsonb;
begin
  if current_setting('request.method', true) in ('GET', 'HEAD') then raise exception 'invalid_request'; end if;
  select * into g from ww_approval.grant_config where singleton;
  if not found or not g.enabled or g.expires_at <= statement_timestamp() then
    raise exception 'integration_disabled';
  end if;
  if token is null or length(token) not between 32 and 512
     or sha256(convert_to(token,'UTF8')) <> g.token_hash
     or not exists (select 1 from auth.users u join public.allowed_auth_emails a
       on lower(u.email) = a.email where u.id = g.owner_id) then
    raise exception 'access_denied';
  end if;
  select * into w from public.redesigned_workspaces where user_id = g.owner_id;
  if w.state->>'format' is distinct from 'workwindow-redesigned'
     or w.state->'version' is distinct from '4'::jsonb
     or jsonb_typeof(w.state->'taskMeta') is distinct from 'object' then
    raise exception 'unsupported_workspace';
  end if;
  foreach source_name in array array['projects','done','events','todos','notes','workItems','workWindows'] loop
    if jsonb_typeof(w.state->source_name) is distinct from 'array' then raise exception 'unsupported_workspace'; end if;
  end loop;
  select count(*), min(p->>'title') into matches, project_name
    from jsonb_array_elements(w.state->'projects') p where p->>'id' = g.project_id;
  if matches <> 1 or nullif(btrim(project_name),'') is null
     or (select count(*) from jsonb_array_elements(w.state->'projects') p where p->>'title'=project_name) <> 1 then
    raise exception 'project_not_unique';
  end if;

  -- Mirror allTasks(): first representation wins, Done wins, metadata can reassign a card.
  with cards as (
    select distinct on (r->>'id') r->>'id' as id, r, src, w.state->'taskMeta'->(r->>'id') as meta
    from unnest(array['done','events','todos','notes','workItems']) with ordinality s(src, precedence)
    cross join lateral jsonb_array_elements(w.state->src) with ordinality records(r, pos)
    where nullif(r->>'id','') is not null and (src <> 'notes' or r->>'type'='Task')
    order by r->>'id', precedence, pos
  ), scoped as (
    select id, src, r || coalesce(meta,'{}') as item, coalesce(r->>'title',r->>'text') as title,
      case when src='done' then 'Done' else coalesce(nullif(meta->>'status','Done'),
        case src when 'workItems' then r->>'status' when 'notes' then 'Backlog' else 'Ready' end) end as status
    from cards where (case when meta ? 'project' then meta->>'project' else r->>'project' end)=project_name
  ), windows as (
    select win from jsonb_array_elements(w.state->'workWindows') win
  ), dependencies as (
    select distinct t.id, d as dependency from scoped t cross join lateral
      jsonb_array_elements_text(coalesce(nullif(t.item->'dependencies','null'),'[]') ||
        jsonb_build_array(t.item->>'dependsOn')) d where nullif(d,'') is not null
  ), tasks as (
    select t.id, t.title, t.status, nullif(t.item->>'blocked','') as blocker,
      left(t.item->>'description',140) as description,
      case when t.src='todos' then coalesce(nullif(t.item->>'plannedFor',''),today::text) end as planned_for,
      least(case when t.src <> 'events' then nullif(t.item->>'date','') end,
        (select min(coalesce(nullif(win->>'due',''),win->>'end')) from windows
          where win->>'type'='task' and win->>'itemId'=t.id)) as due,
      (select min(win->>'start') from windows where win->>'type'='task' and win->>'itemId'=t.id
        and win->>'end'>=day_requested::text) as next_window_start,
      (select sum((win->>'effort')::numeric) from windows where win->>'type'='task'
        and win->>'itemId'=t.id and win->>'effort' ~ '^[0-9]{1,7}$') as effort,
      (select count(*) from dependencies d join scoped p on p.id=d.dependency
        where d.id=t.id and p.status is distinct from 'Done') as waiting,
      (select left(min(p.title),100) from dependencies d join scoped p on p.id=d.dependency
        where d.id=t.id and p.status is distinct from 'Done') as first_prerequisite,
      (select count(*) from dependencies d where d.id=t.id and not exists
        (select 1 from scoped p where p.id=d.dependency)) as unknown,
      (select count(*) from dependencies d join scoped child on child.id=d.id
        where d.dependency=t.id and child.status is distinct from 'Done') as dependents
    from scoped t where t.status is distinct from 'Done'
  ), ranked as (
    select *, row_number() over (order by (blocker is not null or waiting+unknown>0),
      due nulls last, dependents desc, (status='In progress') desc nulls last, id) as n from tasks
  ), bookings as (
    select e->>'start' as start_time,e->>'end' as end_time
    from jsonb_array_elements(w.state->'events') e join scoped t on t.id=e->>'id'
    where coalesce(nullif(e->>'date',''),today::text)=day_requested::text
      and (case when w.state->'taskMeta'->(t.id) ? 'project'
        then w.state->'taskMeta'->(t.id)->>'project' else e->>'project' end)=project_name
  )
  select jsonb_build_object('version',1,'projectId',g.project_id,'project',left(project_name,120),
    'revision',w.revision,'day',day_requested,'timezone','America/Chicago',
    'projectDeadline',(select min(coalesce(nullif(win->>'due',''),win->>'end')) from windows
      where win->>'type'='project' and win->>'itemId'=g.project_id),
    'tasks',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'title',left(title,100),'status',left(status,20),'description',description,'due',due,'plannedFor',planned_for,
      'windowStart',next_window_start,'estimatedMinutes',effort,'blocker',left(blocker,80),'waitingOn',waiting,
      'prerequisite',first_prerequisite,'unverifiedDependencies',unknown,'dependentTasks',dependents)) order by n) from ranked where n<=10),'[]'),
    'omittedTasks',greatest((select count(*) from tasks)-10,0),
    'bookings',coalesce((select jsonb_agg(jsonb_build_array(start_time,end_time) order by start_time,end_time)
      from (select * from bookings order by start_time,end_time limit 24) b),'[]'),
    'omittedBookings',greatest((select count(*) from bookings)-24,0)) into result;
  -- Bound Unicode text and legacy values by bytes as well as by row count.
  while octet_length(result::text)>10000 and jsonb_array_length(result->'tasks')>0 loop
    result := jsonb_set(result #- '{tasks,-1}', '{omittedTasks}', to_jsonb((result->>'omittedTasks')::int+1));
  end loop;
  if octet_length(result::text)>10000 then raise exception 'unsupported_workspace'; end if;
  return result;
end;
$$;
revoke all on function public.workwindow_project_review(text,date) from public, authenticated;
grant execute on function public.workwindow_project_review(text,date) to anon;
commit;
