# Privacy Notice

## Summary

WorkWindow is designed to be local-first by default. This repository does not collect analytics by default and does not include a hosted backend that automatically captures personal usage data.

## Local-First Mode

When used in local mode:

- App state is stored in your browser local storage.
- Data remains on your device unless you explicitly export or sync it.

## Optional Cloud Sync

If you enable cloud sync with your own Supabase project:

- Authentication and synced state are handled by your configured Supabase instance.
- Data handling, retention, and regional controls are governed by your Supabase setup and policies.
- This repository provides client functionality only.

## Repository Data Practices

This public repository should contain:

- Product source code and documentation.
- Sample or placeholder configuration values.

It should not contain:

- Personal task exports.
- Chat transcripts.
- API tokens, bot credentials, or private webhook URLs.

## Third-Party Services

Depending on your deployment choices, you may use third-party services such as:

- Supabase (auth and sync)
- Vercel or other hosting providers
- GitHub Actions for CI

Review each provider policy for operational privacy and compliance details.

## User Controls

You control your data by:

1. Running local-only mode.
2. Clearing browser storage.
3. Exporting and deleting local data.
4. Configuring or disabling cloud sync.

## Contact

For privacy questions about this repository implementation, open a GitHub issue without sensitive personal data.
