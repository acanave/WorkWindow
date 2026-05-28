# Cloud Sync Setup

This guide enables authenticated cloud sync for WorkWindow using Supabase.

## Prerequisites

- A Supabase project
- Local WorkWindow checkout
- Node.js and npm installed

## Steps

1. Create or open a Supabase project.
2. Enable Email OTP / Magic Link authentication in Supabase Auth settings.
3. Run [supabase.sql](./supabase.sql) in the Supabase SQL editor.
4. Copy `.env.example` to `.env.local`.
5. Set the following values in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Validate Supabase Auth configuration:
   - Add local and deployed app URLs to redirect URLs.
   - Ensure Auth Hooks do not block intended signups.
   - If using Supabase built-in SMTP, verify allowed recipient rules.
7. Restart local dev server (`npm run dev`) or redeploy with the same env vars.
8. If deployed (for example Vercel), confirm deployed URL is included in Supabase redirect settings.

## Security Notes

- `.env.example` contains placeholders only.
- `.env.local` must stay untracked.
- Never expose server-only keys (for example service-role keys) in frontend env vars.
- Keep private automation credentials in a separate private repository and secret manager.

## Verification Checklist

- Local mode still launches without cloud env vars.
- Cloud mode sign-in succeeds.
- State sync reads and writes for the authenticated user.
- Logout/login roundtrip restores synced state.
