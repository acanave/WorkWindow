# Inactive task approval API

Candidate only. No hosted database migration, credential, grant, UI route, app import, or deployment is created. The `codex/task-approval-api` branch disables automatic Vercel deployment for that branch only. Existing app behavior and production source remain unchanged.

## Small first version

One owner and one explicitly granted stored project. Create a Backlog `workItems` task with title and optional description; update title/description of an unfinished `workItems` task. Updates preserve other fields and synchronize `taskMeta`. Tasks appearing in other source collections or linked to a WorkWindow/calendar record are rejected initially. Seed-only projects are not supported. No dates, scheduling, completion, deletion, project changes or bulk actions.

`schema.sql` is an uninstalled SQL candidate, not an automatically applied migration. It adds one narrow PostgREST RPC, `POST /rest/v1/rpc/workwindow_task_approval`, to the existing Supabase architecture. No extra application server or broad service-role credential is needed. The private schema must never be exposed in PostgREST configuration.

| Action    | Identity                            | Body                                                               |
| --------- | ----------------------------------- | ------------------------------------------------------------------ |
| `prepare` | Scoped broker token                 | `requestKey`, `operation`, `projectId`, optional `taskId`, `patch` |
| `read`    | Scoped token or signed-in owner     | `id`                                                               |
| `approve` | Signed-in, currently eligible owner | `id`, `digest`                                                     |
| `cancel`  | Signed-in, currently eligible owner | `id`, `digest`                                                     |

The RPC arguments are `{action, body, token}`. Use POST JSON; never put a token in a URL. The Supabase publishable key alone cannot approve. The broker gets no owner login/session, service-role key, direct table access, or approval capability. Its random token is hashed in a private grant row, scoped to one owner/project, expiring, revocable, and disabled by default. No grant row is inserted by the candidate. Provisioning and rotation are deferred to a separate activation review. Do not log request bodies or authorization headers.

Preparation stores an immutable canonical proposal with exact project ID/title, task ID/source, operation, patch, before/after fields including defaults, workspace revision, expiry and SHA-256 digest. Only the stored ID+digest can be approved; no replacement patch or `approved` flag is accepted. The review screen must fetch this record using the owner's authenticated Supabase session, display it as text, and submit approval only on an explicit user click. **That review screen and the OpenClaw HTTP client are still to be wired; this candidate is the approval API boundary.** A GET cannot mutate via this volatile RPC.

## Writes and retries

The grant row and workspace are locked in one database transaction. The task update, revision increment and receipt commit atomically. Concurrent approvals and retries after a lost response return the same receipt. A unique owner/request key returns the same proposal for an identical preparation; different contents under the same key fail. Keep keys stable across retries. Never generate a new key automatically after an uncertain response. Semantic duplicates under deliberately different keys are not detected.

Expiry is ten minutes. Any workspace edit (even unrelated), project rename, grant change or changed proposal requires a fresh proposal and review; no automatic rebase. Cancel the old pending proposal before preparing a replacement. Cancellation/expiry/revocation fail closed. Committed receipts persist without cleanup; do not delete the idempotency records or replay their keys. Revocation also stops receipt reads until access is restored.

Bounds: one pending proposal, ten **new stored proposals** per Chicago day, five committed writes per Chicago day, 200-character title, 4,000-character description, 8KB canonical proposal. Invalid requests and idempotent retries do not consume the preparation counter. This intentionally simple cap is narrower than a rate limiter on all HTTP attempts; network abuse limiting remains an activation concern. No GPT call is made by this API.

## Tests and limits of evidence

The separate GitHub Actions workflow creates PostgreSQL 17.6 plus PostgREST 13.0.7, existing workspace schema/RLS, synthetic auth users/JWTs and fake tasks. It tests actual HTTP requests, simultaneous approvals, permission rejection, changed payloads, stale revisions, cancellation, expiry, revoked grants, daily bounds and rollback when receipt storage fails. It has no hosted Supabase, Telegram, GPT or AWS credentials.

The fixture implements `auth.uid()` from PostgREST's verified claims and creates synthetic users; it does not verify real Supabase magic-link/session lifecycle, production schema drift, or a browser review flow. Before activation: inspect the real schema privately; generate a migration using the project's migration process; run Supabase advisors and review grants/search paths; test owner sign-in and review in an isolated Supabase environment; verify network timeouts/log redaction and a narrow broker client. Supabase's normal access-token validity window applies after sign-out; allowlist/grant revocation is checked on every call.

The internal security-definer function is necessary for atomic access to private proposals and owner workspace without giving the broker table privileges. It is in a non-exposed schema, has an empty search path, authenticates every action, checks authoritative owner eligibility, and has no dynamic SQL. The public RPC is security-invoker. Direct table privileges remain revoked and RLS enabled. Existing owner editing remains available by design; this boundary constrains the integration, not the owner's normal app access.

## Rollback

Now: discard this branch; nothing is installed. Later, if separately deployed: first disable the grant and stop broker admission, revoke RPC execute from `anon`/`authenticated`, preserve proposals/receipts and the workspace backup, then remove the UI/client. Do not delete tasks, roll back the workspace revision, or remove idempotency records to undo an integration deployment. Never run the synthetic bootstrap against a hosted database.

References: [Supabase database functions and privileges](https://supabase.com/docs/guides/database/functions), [Supabase JWTs](https://supabase.com/docs/guides/auth/jwts), [Vercel branch deployment controls](https://vercel.com/docs/project-configuration/git-configuration).

## Recorded isolated verification — November 19, 2026

Source `4a3044a`: [API run 44638735730](https://github.com/acanave/WorkWindow/actions/runs/44638735730) passed all 22 HTTP/PostgreSQL tests. [Application run 44638735769](https://github.com/acanave/WorkWindow/actions/runs/44638735769) passed lint, formatting, unit tests, build and existing browser tests. Secret scan also passed. GitHub listed zero deployments for this candidate branch. No hosted Supabase, real user/task data, AWS, Telegram or GPT was used. The initial test-container quoting and README formatting failures were corrected before these successful runs. These checks establish isolated API behavior, not live authentication or browser approval acceptance.
