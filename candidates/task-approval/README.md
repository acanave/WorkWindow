# Inactive task approval API

Candidate only. No hosted database migration, credential, grant, or deployment is created. The new owner review route is disabled by default. The `codex/task-approval-api` branch disables automatic Vercel deployment for that branch only. Existing app behavior and production source remain unchanged.

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

Preparation stores an immutable canonical proposal with exact project ID/title, task ID/source, operation, patch, before/after fields including defaults, workspace revision, expiry and SHA-256 digest. Only the stored ID+digest can be approved; no replacement patch or `approved` flag is accepted. The review screen must fetch this record using the owner's authenticated Supabase session, display it as text, and submit approval only on an explicit user click. The candidate now includes `src/approval/ApprovalScreen.jsx` behind `VITE_WORKWINDOW_APPROVALS=true`, which is unset by default. The matching inactive OpenClaw broker client lives in its own maintenance repository and exposes prepare/read only. No runtime tool is registered or activated. A GET cannot mutate via this volatile RPC.

## Optional project planner

Basic WorkWindow use and the task approval flow do not require
`project-review.sql` or an assistant. Apply this separate migration only for
an installation that opts into project planning. It uses the existing
enabled, expiring broker grant to read a bounded summary of open tasks and
bookings for the authorized project. It creates no grant, task or calendar
entry. A compatible assistant handles suggestions and draft time blocks.

The planner calls `POST /rest/v1/rpc/workwindow_project_review` with a broker
token in the JSON body and an optional `review_day`. The public function runs
as the caller. The privileged implementation is in `ww_approval`, which must
stay outside the Data API's exposed schemas. The migration does not change
the approval UI flag or grant direct access to workspace tables.

## Writes and retries

The grant row and workspace are locked in one database transaction. The task update, revision increment and receipt commit atomically. Concurrent approvals and retries after a lost response return the same receipt. A unique owner/request key returns the same proposal for an identical preparation; different contents under the same key fail. Keep keys stable across retries. Never generate a new key automatically after an uncertain response. Semantic duplicates under deliberately different keys are not detected.

Expiry is ten minutes. Any workspace edit (even unrelated), project rename, grant change or changed proposal requires a fresh proposal and review; no automatic rebase. Cancel the old pending proposal before preparing a replacement. Cancellation/expiry/revocation fail closed. Committed receipts persist without cleanup; do not delete the idempotency records or replay their keys. Revocation also stops receipt reads until access is restored.

Bounds: one pending proposal, ten **new stored proposals** per Chicago day, five committed writes per Chicago day, 200-character title, 4,000-character description, 8KB canonical proposal. Invalid requests and idempotent retries do not consume the preparation counter. This intentionally simple cap is narrower than a rate limiter on all HTTP attempts; network abuse limiting remains an activation concern. No GPT call is made by this API.

## Tests and limits of evidence

The separate GitHub Actions workflow creates PostgreSQL 17.6 plus PostgREST 13.0.7, existing workspace schema/RLS, synthetic auth users/JWTs and fake tasks. It tests actual HTTP requests, simultaneous approvals, permission rejection, changed payloads, stale revisions, cancellation, expiry, revoked grants, daily bounds and rollback when receipt storage fails. It has no hosted Supabase, Telegram, GPT or AWS credentials.

The fixture implements `auth.uid()` from PostgREST's verified claims and creates synthetic users; it does not verify real Supabase magic-link/session lifecycle, production schema drift, or production authentication/redirect behavior. A separate cross-repository CI workflow tests the browser review flow with synthetic sessions. Before activation: inspect the real schema privately; generate a migration using the project's migration process; run Supabase advisors and review grants/search paths; test owner sign-in and review in an isolated Supabase environment; verify deployed network/logging boundaries and the trusted broker/tool adapter. Supabase's normal access-token validity window applies after sign-out; allowlist/grant revocation is checked on every call.

The internal security-definer function is necessary for atomic access to private proposals and owner workspace without giving the broker table privileges. It is in a non-exposed schema, has an empty search path, authenticates every action, checks authoritative owner eligibility, and has no dynamic SQL. The public RPC is security-invoker. Direct table privileges remain revoked and RLS enabled. Existing owner editing remains available by design; this boundary constrains the integration, not the owner's normal app access.

## Rollback

Now: discard this branch; nothing is installed. Later, if separately deployed: first disable the grant and stop broker admission, revoke RPC execute from `anon`/`authenticated`, preserve proposals/receipts and the workspace backup, then remove the UI/client. Do not delete tasks, roll back the workspace revision, or remove idempotency records to undo an integration deployment. Never run the synthetic bootstrap against a hosted database.

References: [Supabase database functions and privileges](https://supabase.com/docs/guides/database/functions), [Supabase JWTs](https://supabase.com/docs/guides/auth/jwts), [Vercel branch deployment controls](https://vercel.com/docs/project-configuration/git-configuration).

## Recorded isolated verification — November 19, 2026

Source `4a3044a`: [API run 44638735730](https://github.com/acanave/WorkWindow/actions/runs/44638735730) passed all 22 HTTP/PostgreSQL tests. [Application run 44638735769](https://github.com/acanave/WorkWindow/actions/runs/44638735769) passed lint, formatting, unit tests, build and existing browser tests. Secret scan also passed. GitHub listed zero deployments for this candidate branch. No hosted Supabase, real user/task data, AWS, Telegram or GPT was used. The initial test-container quoting and README formatting failures were corrected before these successful runs. These checks establish isolated API behavior, not live authentication or browser approval acceptance.

## Inactive review screen

A review link contains only `?approval=<UUID>`. With the feature flag off, the existing app behaves as before. When explicitly enabled in isolated tests, the route requires the normal owner session and reads the authoritative proposal before offering approval. The UI shows project/task identity and before/after values, renders text safely, disables repeat clicks, and never writes on page load. A failed or uncertain approval disables further approval until the owner checks status; cancellation remains explicit. Expiry and stale workspace errors require a new proposal. The server remains authoritative for access, expiry and duplicate protection.

Sign-in redirects retain only a validated proposal ID on the same app origin; configure and test the exact callback in an isolated Supabase environment before activation. A separate browser tab and unsynced edits still use existing revision-conflict protection. No broker token, task content or digest goes in the review URL. The test-only Vite config under this directory proxies to loopback PostgREST and is never used by the normal build/deployment.

November 19 review-screen evidence: WorkWindow source `2e27e23` passed [application CI 44642095453](https://github.com/acanave/WorkWindow/actions/runs/44642095453): 72 unit tests, 5 existing browser tests, lint, formatting and build; secret scan also passed. The separate OpenClaw maintenance CI tested this exact source with its restricted client: 4 client checks, 22 API checks and 7 full browser/database scenarios passed, including lost-response recovery without a second task write. Desktop and mobile screenshots used fake tasks and were inspected. No deployment, hosted schema/auth change, real task or live assistant was involved. The feature remains off by default, branch auto-deployment remains disabled, and production magic-link/redirect acceptance and trusted runtime tool registration remain outstanding.

## Local navigation fix during hosted acceptance

The temporary hosted test revealed that ordinary page/calendar/board navigation
called cloud saves and advanced the workspace revision without a task edit. The
candidate now keeps view-only preferences in the device cache and skips unchanged
content saves. Real task/project/draft changes still use the existing serialized
save queue and revision conflict checks. Approval SQL and immutable proposal
validation are unchanged. Navigation during an in-flight content save no longer
leaves a false dirty state. Local lint, 74 unit tests and build passed; a real
browser with intercepted synthetic API responses verified zero writes while
switching views and reloading. Production app and OpenClaw remain unchanged.
