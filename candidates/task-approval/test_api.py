"""Real PostgREST/PostgreSQL tests; every identity and task is synthetic."""
import base64
import concurrent.futures
import hashlib
import hmac
import json
import subprocess
import time
import unittest
import urllib.error
import urllib.request
import urllib.parse

OWNER = '11111111-1111-4111-8111-111111111111'
STRANGER = '22222222-2222-4222-8222-222222222222'
TOKEN = 'synthetic-broker-token-never-use-in-production'
JWT_SECRET = b'synthetic-jwt-secret-at-least-thirty-two-characters'
URL = 'http://127.0.0.1:3001'


def sql(statement):
    result = subprocess.run(['psql', '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', statement],
                            capture_output=True, text=True, check=True)
    return result.stdout.strip()


def jwt(subject):
    def enc(value):
        return base64.urlsafe_b64encode(json.dumps(value).encode()).rstrip(b'=')
    head = enc({'alg': 'HS256', 'typ': 'JWT'})
    claims = enc({'role': 'authenticated', 'sub': subject, 'exp': int(time.time()) + 600})
    data = head + b'.' + claims
    return (data + b'.' + base64.urlsafe_b64encode(hmac.digest(JWT_SECRET, data, 'sha256')).rstrip(b'=')).decode()


def http(path, payload=None, subject=None, method=None):
    headers = {'Content-Type': 'application/json'}
    if subject:
        headers['Authorization'] = 'Bearer ' + jwt(subject)
    req = urllib.request.Request(URL + path,
        data=json.dumps(payload).encode() if payload is not None else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read())


def api(action, body, subject=None, token=None):
    return http('/rpc/workwindow_task_approval', {'action': action, 'body': body, 'token': token}, subject)


def request(key='request-1', **overrides):
    return {'requestKey': key, 'operation': 'create', 'projectId': 'project-1',
            'patch': {'title': 'Synthetic task', 'description': 'Fake details'}, **overrides}


class ApprovalAPI(unittest.TestCase):
    def setUp(self):
        workspace = {'format': 'workwindow-redesigned', 'version': 4,
                     'projects': [{'id': 'project-1', 'title': 'Fake project'}],
                     'workItems': [{'id': 'task-1', 'title': 'Before', 'description': 'Original',
                                    'project': 'Fake project', 'status': 'Backlog', 'notes': 'Preserve'}],
                     'done': [], 'todos': [], 'events': [], 'notes': [], 'workWindows': [],
                     'taskMeta': {}, 'reminders': [], 'selected': None, 'unrelated': {'keep': True}}
        sql("truncate ww_approval.proposals, ww_approval.grant_config, public.redesigned_workspaces; "
            "delete from public.allowed_auth_emails; "
            "insert into public.allowed_auth_emails values ('owner@example.invalid'); "
            f"insert into public.redesigned_workspaces values ('{OWNER}', '{json.dumps(workspace)}',1,now()); "
            "insert into ww_approval.grant_config(owner_id,project_id,token_hash,enabled,expires_at) values "
            f"('{OWNER}','project-1',sha256(convert_to('{TOKEN}','UTF8')),true,now()+interval '1 hour');")

    def prepare(self, body=None):
        code, result = api('prepare', body or request(), token=TOKEN)
        self.assertEqual(code, 200, result)
        return result

    def approval(self, proposal):
        return {'id': proposal['proposal']['id'], 'digest': proposal['digest']}

    def deny(self, result, message=None):
        code, body = result
        self.assertGreaterEqual(code, 400, body)
        if message:
            self.assertEqual(body.get('message'), message)

    def state(self):
        return json.loads(sql('select state from public.redesigned_workspaces'))

    def change(self, expression):
        sql(f'update public.redesigned_workspaces set state = {expression}, revision = revision+1')

    def test_default_disabled(self):
        sql('update ww_approval.grant_config set enabled = false')
        self.deny(api('prepare', request(), token=TOKEN), 'integration_disabled')
        sql('delete from ww_approval.grant_config')
        self.deny(api('prepare', request(), token=TOKEN), 'integration_disabled')

    def test_exact_preview_and_no_write_before_approval(self):
        p = self.prepare()
        preview = p['proposal']
        self.assertEqual(preview['projectTitle'], 'Fake project')
        self.assertEqual(preview['source'], 'workItems')
        self.assertIsNone(preview['before'])
        self.assertEqual(preview['after']['status'], 'Backlog')
        self.assertEqual(preview['after']['description'], 'Fake details')
        self.assertEqual(len(self.state()['workItems']), 1)
        self.assertEqual(api('read', {'id': preview['id']}, OWNER), (200, p))
        self.assertEqual(len(self.state()['workItems']), 1)
        # GET is never a write-capable RPC path.
        query = urllib.parse.urlencode({'action': 'approve', 'body': json.dumps(self.approval(p))})
        self.deny(http('/rpc/workwindow_task_approval?' + query, subject=OWNER))
        self.assertEqual(len(self.state()['workItems']), 1)

    def test_only_signed_in_owner_can_approve(self):
        p = self.prepare()
        for subject in [None, STRANGER]:
            self.deny(api('approve', self.approval(p), subject, TOKEN), 'owner_confirmation_required')
        code, receipt = api('approve', self.approval(p), OWNER)
        self.assertEqual(code, 200, receipt)
        self.assertEqual(receipt['status'], 'committed')
        self.assertEqual(len(self.state()['workItems']), 2)

    def test_no_forged_owner_or_approved_flag(self):
        for extra in [{'approved': True}, {'ownerId': OWNER}, {'status': 'Done'}]:
            self.deny(api('prepare', request(**extra), token=TOKEN), 'invalid_request')
        p = self.prepare()
        self.deny(api('approve', {**self.approval(p), 'patch': {'title': 'Changed'}}, OWNER), 'invalid_request')

    def test_authentication_and_scope(self):
        for token in [None, 'wrong-token-is-long-enough-but-still-wrong']:
            self.deny(api('prepare', request(), token=token), 'access_denied')
        self.deny(api('prepare', request(projectId='other'), token=TOKEN), 'invalid_request')
        p = self.prepare()
        self.deny(api('read', {'id': p['proposal']['id']}, STRANGER), 'access_denied')
        self.deny(api('read', {'id': p['proposal']['id']}), 'access_denied')

    def test_idempotent_prepare_and_changed_request(self):
        p = self.prepare()
        self.assertEqual(self.prepare(), p)
        self.deny(api('prepare', request(patch={'title': 'Other'}), token=TOKEN), 'idempotency_conflict')

    def test_repeated_approval_and_lost_response(self):
        p = self.prepare()
        first = api('approve', self.approval(p), OWNER)
        self.assertEqual(first[0], 200)
        # Fresh HTTP/DB connections model retry after the successful response was lost.
        self.assertEqual(api('approve', self.approval(p), OWNER), first)
        self.assertEqual(self.prepare()['receipt'], first[1])
        self.assertEqual(sql('select revision from public.redesigned_workspaces'), '2')
        self.assertEqual(len(self.state()['workItems']), 2)

    def test_concurrent_approvals_commit_once(self):
        p = self.prepare()
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda _: api('approve', self.approval(p), OWNER), range(8)))
        self.assertTrue(all(r == results[0] for r in results), results)
        self.assertEqual(results[0][0], 200)
        self.assertEqual(sql('select revision from public.redesigned_workspaces'), '2')

    def test_concurrent_prepare_returns_one_proposal(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda _: api('prepare', request(), token=TOKEN), range(8)))
        self.assertTrue(all(r == results[0] for r in results), results)
        self.assertEqual(results[0][0], 200)
        self.assertEqual(sql('select count(*) from ww_approval.proposals'), '1')

    def test_digest_must_match(self):
        p = self.prepare()
        for digest in [None, 'different']:
            self.deny(api('approve', {**self.approval(p), 'digest': digest}, OWNER), 'proposal_changed')
        self.assertEqual(sql('select revision from public.redesigned_workspaces'), '1')

    def test_stale_revision_requires_new_review(self):
        p = self.prepare()
        self.change("jsonb_set(state,'{unrelated,keep}','false')")
        self.deny(api('approve', self.approval(p), OWNER), 'stale_proposal')
        self.assertEqual(api('cancel', self.approval(p), OWNER)[0], 200)
        replacement = self.prepare(request('replacement'))
        self.assertNotEqual(replacement['digest'], p['digest'])
        self.assertEqual(api('approve', self.approval(replacement), OWNER)[0], 200)

    def test_project_rename_and_ambiguity(self):
        p = self.prepare()
        self.change("jsonb_set(state,'{projects,0,title}','\"Renamed\"')")
        self.deny(api('approve', self.approval(p), OWNER), 'stale_proposal')
        self.change("jsonb_set(state,'{projects}', '[{\"id\":\"project-1\",\"title\":\"Same\"},{\"id\":\"other\",\"title\":\"Same\"}]')")
        self.deny(api('prepare', request('other'), token=TOKEN), 'project_not_unique')

    def test_cancel_expire_revoke(self):
        p = self.prepare()
        self.assertEqual(api('cancel', self.approval(p), OWNER)[0], 200)
        self.deny(api('approve', self.approval(p), OWNER), 'proposal_not_pending')
        p = self.prepare(request('expires'))
        sql("update ww_approval.proposals set expires_at = now()-interval '1 second' where status='pending'")
        self.deny(api('approve', self.approval(p), OWNER), 'proposal_not_pending')
        self.assertEqual(api('read', {'id': p['proposal']['id']}, OWNER)[1]['status'], 'expired')
        p = self.prepare(request('revoke'))
        sql('update ww_approval.grant_config set enabled = false')
        self.deny(api('approve', self.approval(p), OWNER), 'integration_disabled')

    def test_allowlist_removal_and_grant_expiry(self):
        p = self.prepare()
        sql('delete from public.allowed_auth_emails')
        self.deny(api('approve', self.approval(p), OWNER), 'access_denied')
        sql("insert into public.allowed_auth_emails values ('owner@example.invalid'); update ww_approval.grant_config set expires_at=now()-interval '1 second'")
        self.deny(api('approve', self.approval(p), OWNER), 'integration_disabled')

    def test_update_preserves_other_fields_and_updates_metadata(self):
        self.change("jsonb_set(state,'{taskMeta,task-1}', '{\"description\":\"Metadata original\",\"blocked\":\"Preserve blocker\"}')")
        p = self.prepare(request(operation='update', taskId='task-1', patch={'title': 'After', 'description': 'New'}))
        self.assertEqual(p['proposal']['before']['description'], 'Metadata original')
        self.assertEqual(api('approve', self.approval(p), OWNER)[0], 200)
        state = self.state()
        self.assertEqual(state['workItems'][0]['title'], 'After')
        self.assertEqual(state['workItems'][0]['notes'], 'Preserve')
        self.assertEqual(state['taskMeta']['task-1']['description'], 'New')
        self.assertEqual(state['taskMeta']['task-1']['blocked'], 'Preserve blocker')
        self.assertEqual(state['unrelated'], {'keep': True})

    def test_unsupported_task_types_and_fields(self):
        for patch in [{'status': 'Done'}, {'date': '2030-01-01'}, {}, {'title': None}, {'title': ''}, {'title': 'x'*201}, {'description': 'x'*4001}]:
            self.deny(api('prepare', request(patch=patch), token=TOKEN))
        self.deny(api('prepare', request(operation='delete'), token=TOKEN), 'invalid_request')
        self.deny(api('prepare', request(operation='update', taskId='missing'), token=TOKEN), 'unsupported_task')
        for source in ['done', 'events', 'todos', 'notes']:
            self.setUp()
            self.change(f"jsonb_set(state,'{{{source}}}', '[{{\"id\":\"task-1\"}}]')")
            self.deny(api('prepare', request(operation='update', taskId='task-1'), token=TOKEN), 'unsupported_task')
        self.setUp()
        self.change("jsonb_set(state,'{workWindows}', '[{\"itemId\":\"task-1\"}]')")
        self.deny(api('prepare', request(operation='update', taskId='task-1'), token=TOKEN), 'unsupported_task')

    def test_pending_and_daily_limits(self):
        p = self.prepare()
        self.deny(api('prepare', request('other'), token=TOKEN), 'pending_proposal_exists')
        self.assertEqual(api('cancel', self.approval(p), OWNER)[0], 200)
        for i in range(9):
            p = self.prepare(request(str(i)))
            self.assertEqual(api('cancel', self.approval(p), OWNER)[0], 200)
        self.deny(api('prepare', request('eleventh'), token=TOKEN), 'daily_prepare_limit')
        self.setUp()
        for i in range(5):
            p = self.prepare(request(str(i)))
            self.assertEqual(api('approve', self.approval(p), OWNER)[0], 200)
        p = self.prepare(request('sixth'))
        self.deny(api('approve', self.approval(p), OWNER), 'daily_write_limit')
        self.assertEqual(len(self.state()['workItems']), 6)

    def test_private_tables_and_existing_rls(self):
        for table in ['proposals', 'grant_config']:
            self.deny(http('/' + table, subject=OWNER))
        self.deny(http('/redesigned_workspaces'))
        self.assertEqual(http('/redesigned_workspaces', subject=STRANGER), (200, []))
        code, rows = http('/redesigned_workspaces', subject=OWNER)
        self.assertEqual(code, 200)
        self.assertEqual(len(rows), 1)
        # SQL privilege checks are independent of schema exposure.
        self.assertEqual(sql("select has_table_privilege('authenticated','ww_approval.proposals','UPDATE')"), 'f')
        self.assertEqual(sql("select has_table_privilege('anon','ww_approval.grant_config','SELECT')"), 'f')

    def test_changed_grant_blocks_old_proposal(self):
        p = self.prepare()
        sql("update ww_approval.grant_config set project_id='other'")
        self.deny(api('approve', self.approval(p), OWNER), 'grant_changed')
        self.deny(api('read', {'id': p['proposal']['id']}, token=TOKEN), 'grant_changed')

    def test_completed_task_rejected(self):
        self.change("jsonb_set(state,'{workItems,0,status}','\"Done\"')")
        self.deny(api('prepare', request(operation='update', taskId='task-1'), token=TOKEN), 'unsupported_task')

    def test_browser_save_race_cannot_overwrite_approved_task(self):
        p = self.prepare()
        browser_state = self.state()
        browser_state['unrelated']['keep'] = False
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            approval = pool.submit(api, 'approve', self.approval(p), OWNER)
            browser = pool.submit(http, '/redesigned_workspaces?revision=eq.1',
                                  {'state': browser_state, 'revision': 2}, OWNER, 'PATCH')
            approve_result, browser_result = approval.result(), browser.result()
        self.assertLess(browser_result[0], 300, browser_result)
        final = self.state()
        self.assertEqual(sql('select revision from public.redesigned_workspaces'), '2')
        if approve_result[0] == 200:
            self.assertEqual(len(final['workItems']), 2)
            self.assertTrue(final['unrelated']['keep'])
        else:
            self.deny(approve_result, 'stale_proposal')
            self.assertEqual(len(final['workItems']), 1)
            self.assertFalse(final['unrelated']['keep'])

    def test_failed_receipt_rolls_back_task(self):
        p = self.prepare()
        sql("create function ww_approval.fail_test() returns trigger language plpgsql as $$ begin raise exception 'synthetic_receipt_failure'; end $$; "
            "create trigger fail_test before update on ww_approval.proposals for each row execute function ww_approval.fail_test();")
        try:
            self.deny(api('approve', self.approval(p), OWNER), 'synthetic_receipt_failure')
            self.assertEqual(sql('select revision from public.redesigned_workspaces'), '1')
            self.assertEqual(len(self.state()['workItems']), 1)
        finally:
            sql('drop trigger fail_test on ww_approval.proposals; drop function ww_approval.fail_test()')
        self.assertEqual(api('approve', self.approval(p), OWNER)[0], 200)


if __name__ == '__main__':
    unittest.main(verbosity=2)
