# WorkWindow Redesigned release candidate

Mac browser first. iPhone supports quick review; native desktop notes, offline operation, installation, and background push notifications are outside this release.

## Changes

- Capture a sticky, task, reminder, or project directly; choose today's work and finish or defer it.
- Connected dashboard, calendar, stacked boards, and project summaries with consistent project labels.
- Editable task WorkWindow dates and hours, notes, blockers, and workflow stages.
- Light/dark appearance, keyboard-accessible daily schedule, and responsive navigation.
- Empty new workspaces: sample projects and tasks are not included in runtime initialization.
- Existing cloud cards migrate without replacing the original `user_states` record. Original records and point estimates are retained; points are not converted into hours.
- Serialized cloud saves use revision checks. Conflicts pause saving and retain the local draft with an export option. Refreshes cannot replace edits made while a refresh was in flight.

## Verified locally

- 64 unit tests, including legacy migration, save ordering, conflict handling, and cloud lifecycle races.
- Five browser tests: capture/today/completion/reload; project task dates/hours/notes/blocker persistence and calendar appearance; all four primary views with WCAG A/AA checks in light and dark; narrow-screen navigation.
- Lint (zero errors; four pre-existing Fast Refresh warnings), formatting, and production build.
- `npm audit --omit=dev`: zero reported vulnerabilities. Five moderate development-tool advisories remain in Vitest/Tailwind dependencies; they are not shipped in the runtime bundle.
- Build warns about one approximately 503 kB uncompressed JS chunk (approximately 144 kB gzip). Performance splitting remains a follow-up.

## Database preparation

`docs/redesigned-workspaces.sql` was applied to Supabase project `jmhgzapkgcejsdcmphvy` as `redesigned_workspaces`.

Owner insert/update, denied stale revision, denied non-owner read/insert, and denied anonymous access were verified in a rolled-back transaction. The new table remained empty afterward. The legacy workspace digest was identical before and after.

Existing security advisories, unchanged by this release:

- Signup hook lacks a fixed search path: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- `is_current_user_allowed` is an intentionally callable security-definer boolean helper used by ownership policies; revoking it would break access: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Password breach protection is disabled; the application uses magic-link login: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Remaining release gates

1. Push the candidate branch and confirm hosted CI checks.
2. Stage with production environment variables and `--skip-domain` in Vercel project `prj_ASbYy66zhuCGYS7IpnYnQe8myZ52`, team `team_cK2URzQoSxRuZPfHeENyfcIC`.
3. Verify the staged build, magic-link redirect, authenticated loading, save/reload, and cross-session refresh. An owner's sign-in is needed for this final check; do not export or commit authentication state.
4. Promote only the tested production build after those gates pass. Keep the main-branch PR workflow.

## Rollback

Current production rollback target: `dpl_CbY9kWfa7RNbhZqDwjPSRwcDy6LC` (`workwindow-8sc5z4r7s-al-canaverals-projects.vercel.app`), commit `d9681a4228ea894157ac8d2494c09e75af900619`.

A deployment rollback restores the old interface and reads the untouched legacy workspace. It does **not** include work newly entered in the redesigned table. Export redesigned work before reverting and reconcile afterward. Do not drop the new table or run any preview reset against cloud data.
