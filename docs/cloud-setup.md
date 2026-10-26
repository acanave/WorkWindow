# Cloud setup

The redesigned app uses Supabase Auth and owner-scoped JSON workspaces in Postgres. This guide describes a private, approved-user deployment, not public self-service registration.

## Fresh project

1. Use Node.js 24.x and install with `npm ci`.
2. Create a Supabase project and enable email magic-link authentication. Provision your intended user through Supabase's administrative user/invitation flow; the app sends links with `shouldCreateUser: false`.
3. Apply [personal-access.sql](personal-access.sql), which creates the private email allowlist and the boolean access helper. Add the intended email to that table through the administrator's SQL editor. Do not commit that email or export the table.
4. Apply [supabase.sql](supabase.sql) for the legacy table required by the first-load fallback, then [redesigned-workspaces.sql](redesigned-workspaces.sql) for the redesigned table and revision guard. These setup scripts are one-time schema steps; do not blindly rerun policies on an existing project.
5. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Use only a publishable client key, never a secret/service-role key.
6. Set Supabase's Site URL to the production origin. Add exact local/staged/deployed origins to allowed Redirect URLs. The app requests `window.location.origin`; an unapproved address falls back to the Site URL. Verify custom email templates honor the requested redirect.
7. Verify email delivery and any provider recipient restrictions. Restart Vite or rebuild the hosted app after changing environment values; Vite embeds them at build time.

## Existing deployment upgrade

Back up the database and inspect existing ownership/allowlist policies first. Preserve `user_states` and any existing access helper. Apply only the missing redesigned schema through the project's migration process. Do not run an empty preview reset against cloud data.

On first load, the app reads `redesigned_workspaces`, or migrates the signed-in user's legacy record when no redesigned row exists. The first edit saves the new format separately. Original legacy data remains unchanged. Points are retained as historical context rather than guessed as hours.

## Verification and release

- Verify an approved owner can read/write, an unapproved user cannot, and anonymous requests cannot access workspace data.
- Verify stale revision updates fail; never resolve a conflict by blindly overwriting the latest state.
- Test magic-link sign-in at the exact staged address, task capture, dates/effort, notes, blockers, reload, and another session.
- Stage a production-environment build without assigning live domains, then promote that tested build after checks pass.
- Test the live URL again. Preserve the previous deployment and database backup.

A UI rollback to the old app reads the legacy table and does not include new redesigned edits. Export/reconcile new work before rollback. Clearing local storage or signing out does not delete the cloud workspace.

## References

- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Email authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
