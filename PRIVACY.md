# Privacy Notice

## Where your work is stored

When Supabase is not configured, WorkWindow saves workspace content in this browser's local storage. It does not sync that local workspace automatically to an account.

When Supabase is configured, email authentication and workspace storage use that Supabase project. The app also caches workspace content and pending edits in local storage, scoped to the signed-in account. Signing out ends access through the interface but does not erase that device cache. Avoid shared browser profiles for private work.

The hosted application uses cloud sync. Browser storage is not a substitute for cloud backups. Clearing it can discard local-only work and unsynced edits; it does not delete cloud records.

## Data handled

Workspace content includes sticky notes, task/project titles and notes, reminders, dates, effort estimates, blockers, workflow state, and display preferences. Migrated workspaces retain original legacy records. Supabase handles the sign-in email and authentication session; hosting and authentication providers may retain operational logs under their own policies.

No analytics SDK or advertising tracker is included by the application. That does not imply hosting providers collect no operational data.

## Your controls

- Export backup downloads a JSON copy of the workspace. Keep it private.
- Local-only users can clear browser storage after preserving any needed work.
- Cloud data deletion or retention changes currently require the deployment administrator; there is no account-deletion or backup-import interface in this release.
- In a save conflict, export the device's edits before discarding them and loading the cloud version.

## Public repository

Source code, schemas, fictional test fixtures, and documentation are public. User workspaces, real screenshots, authentication state, credentials, and private exports must not be committed. Automated secret scanning is a safeguard, not a guarantee that every kind of personal information will be detected.

For a private deployment, its operator controls Supabase access, retention, backups, email delivery, and hosting. Review those providers' policies. Do not post private workspace content or credentials in a public GitHub issue.
