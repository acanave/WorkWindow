-- Disposable fixture only. Start with the synthetic owner and grant from test_api.py.
begin;
do $$ begin
  assert not (select prosecdef from pg_proc where oid='public.workwindow_project_review(text,date)'::regprocedure),
    'The public planner endpoint must run as the caller';
  assert (select prosecdef from pg_proc where oid='ww_approval.review_project(text,date)'::regprocedure),
    'Elevated workspace access belongs in the private schema';
  assert not has_function_privilege('authenticated','public.workwindow_project_review(text,date)','EXECUTE');
  assert not has_function_privilege('authenticated','ww_approval.review_project(text,date)','EXECUTE');
  assert not has_table_privilege('anon','public.redesigned_workspaces','SELECT');
end $$;
update public.redesigned_workspaces set revision=revision+1,
  state = state || '{
    "projects":[{"id":"project-1","title":"Fake project"},{"id":"project-2","title":"Foreign project"}],
    "workItems":[{"id":"a","title":"Test the export","project":"Fake project","status":"In progress"},
      {"id":"b","title":"Write the handoff","project":"Fake project","dependencies":["a","z","finished"],
       "blocked":"Awaiting sign-off","date":"2026-11-30","status":"In progress","description":"Include the export."},
      {"id":"e","title":"PRIVATE-CANARY","project":"Foreign project","blocked":"PRIVATE-CANARY","date":"2026-11-28"},
      {"id":"z","title":"PRIVATE-CANARY","project":"Foreign project"},
      {"id":"moved","title":"PRIVATE-CANARY","project":"Fake project"}],
    "taskMeta":{"moved":{"project":"Foreign project"}},
    "done":[{"id":"finished","title":"Finished task","project":"Fake project"}],
    "events":[{"id":"b","project":"Fake project","date":"2026-11-24","start":"09:00","end":"09:30","title":"Draft handoff"},
      {"id":"e","project":"Fake project","date":"2026-11-24","start":"14:00","end":"14:30","title":"Check-in"},
      {"id":"other","project":"Foreign project","date":"2026-11-24","start":"15:00","end":"15:30","title":"PRIVATE-CANARY"}],
    "notes":[{"id":"ignored","type":"Sticky","text":"PRIVATE-CANARY","project":"Fake project"}],
    "todos":[{"id":"finished","title":"Obsolete duplicate","project":"Fake project"}],
    "workWindows":[{"itemId":"a","type":"task","start":"2026-11-22","due":"2026-11-25","effort":45}]
  }'::jsonb;
set local role anon;
do $$
declare
  s jsonb;
  task jsonb;
begin
  s := public.workwindow_project_review('synthetic-broker-token-never-use-in-production','2026-11-24');
  assert s->>'projectId'='project-1' and s->>'revision'='2' and s->>'omittedTasks'='0';
  assert jsonb_array_length(s->'tasks')=3 and s->'bookings'='[["09:00","09:30"],["14:00","14:30"]]'::jsonb;
  assert s::text not like '%PRIVATE-CANARY%' and s::text not like '%Obsolete duplicate%';
  select v into strict task from jsonb_array_elements(s->'tasks') v where v->>'title'='Write the handoff';
  assert task->>'waitingOn'='1' and task->>'unverifiedDependencies'='1' and task->>'prerequisite'='Test the export';
  assert task @> '{"blocker":"Awaiting sign-off","due":"2026-11-30","status":"In progress","description":"Include the export."}'::jsonb,
    'Booking a task must preserve its details and actual deadline';
  select v into strict task from jsonb_array_elements(s->'tasks') v where v->>'title'='Check-in';
  assert not (task ? 'due' or task ? 'blocker'), 'A booking date is not a deadline, and foreign fields must stay private';
  select v into strict task from jsonb_array_elements(s->'tasks') v where v->>'title'='Test the export';
  assert task->>'estimatedMinutes'='45' and task->>'due'='2026-11-25' and task->>'dependentTasks'='1';
  begin
    perform public.workwindow_project_review('wrong');
    raise exception 'unexpected success';
  exception when raise_exception then
    if sqlerrm <> 'access_denied' then raise; end if;
  end;
end;
$$;
set local "request.method" = 'GET';
do $$ begin
  perform public.workwindow_project_review('synthetic-broker-token-never-use-in-production');
  raise exception 'unexpected success';
exception when raise_exception then
  if sqlerrm <> 'invalid_request' then raise; end if;
end $$;
set local "request.method" = 'POST';
reset role;
do $$ begin
  assert (select count(*) from ww_approval.proposals)=0;
  assert (select revision from public.redesigned_workspaces)=2;
end $$;
update public.redesigned_workspaces set revision=revision+1,
  state=jsonb_set(state, '{workItems}',state->'workItems' || (
    select jsonb_agg(jsonb_build_object('id','bulk-'||i,'project','Fake project','title','Synthetic '||i))
    from generate_series(1,20) i));
do $$ declare s jsonb; begin
  s := public.workwindow_project_review('synthetic-broker-token-never-use-in-production','2026-11-24');
  assert jsonb_array_length(s->'tasks')=10 and s->>'omittedTasks'='13';
end $$;
-- Ten earlier deadlines must not hide the only task available on the review day.
with future_tasks as (
  select jsonb_agg(jsonb_build_object('id','future-'||i,'title','Future task '||i,'project','Fake project')) as items,
    jsonb_agg(jsonb_build_object('itemId','future-'||i,'type','task','start','2026-11-25','end','2026-11-26')) as windows
  from generate_series(1,10) i
)
update public.redesigned_workspaces set revision=revision+1,
  state=state || jsonb_build_object('done','[]'::jsonb,'events','[]'::jsonb,'todos','[]'::jsonb,'notes','[]'::jsonb,
    'taskMeta','{}'::jsonb,'workItems',items || '[{"id":"available","title":"Available today","project":"Fake project","date":"2026-12-01"}]'::jsonb,
    'workWindows',windows)
from future_tasks;
set local role anon;
do $$ declare s jsonb; begin
  s := public.workwindow_project_review('synthetic-broker-token-never-use-in-production','2026-11-24');
  assert s#>>'{tasks,0,title}'='Available today' and jsonb_array_length(s->'tasks')=10 and s->>'omittedTasks'='1',
    'Return the actionable task before truncating the result';
  s := public.workwindow_project_review('synthetic-broker-token-never-use-in-production','2026-11-25');
  assert s#>>'{tasks,0,due}'='2026-11-26' and s#>>'{tasks,0,windowStart}'='2026-11-25',
    'Windows opening on the requested day are eligible';
end $$;
reset role;
update public.redesigned_workspaces set revision=revision+1,
  state=jsonb_set(state,'{projects}',state->'projects' || '[{"id":"different","title":"Fake project"}]'::jsonb);
do $$ begin
  perform public.workwindow_project_review('synthetic-broker-token-never-use-in-production');
  raise exception 'unexpected success';
exception when raise_exception then
  if sqlerrm <> 'project_not_unique' then raise; end if;
end $$;
update ww_approval.grant_config set expires_at=now()-interval '1 minute';
set local role anon;
do $$ begin
  perform public.workwindow_project_review('synthetic-broker-token-never-use-in-production');
  raise exception 'unexpected success';
exception when raise_exception then
  if sqlerrm <> 'integration_disabled' then raise; end if;
end $$;
rollback;
