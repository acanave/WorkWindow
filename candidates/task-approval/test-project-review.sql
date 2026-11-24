-- Disposable fixture only. run_agent_tasks.py --planner supplies the synthetic grant.
begin;
update public.redesigned_workspaces set revision=revision+1,
  state = state || '{
    "projects":[{"id":"project-1","title":"Fake project"},{"id":"project-2","title":"Foreign project"}],
    "workItems":[{"id":"a","title":"Test the export","project":"Fake project","status":"In progress"},
      {"id":"b","title":"Write the handoff","project":"Fake project","dependencies":["a","z","finished"]},
      {"id":"z","title":"PRIVATE-CANARY","project":"Foreign project"},
      {"id":"moved","title":"PRIVATE-CANARY","project":"Fake project"}],
    "taskMeta":{"moved":{"project":"Foreign project"}},
    "done":[{"id":"finished","title":"Finished task","project":"Fake project"}],
    "events":[{"id":"e","project":"Fake project","date":"2026-11-24","start":"14:00","end":"14:30","title":"Check-in"},
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
  assert jsonb_array_length(s->'tasks')=3 and s->'bookings'='[["14:00","14:30"]]'::jsonb;
  assert s::text not like '%PRIVATE-CANARY%' and s::text not like '%Obsolete duplicate%';
  select v into strict task from jsonb_array_elements(s->'tasks') v where v->>'title'='Write the handoff';
  assert task->>'waitingOn'='1' and task->>'unverifiedDependencies'='1' and task->>'prerequisite'='Test the export';
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
