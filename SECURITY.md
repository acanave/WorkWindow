# Security Policy

## Supported Scope

This repository contains the public WorkWindow frontend application and supporting documentation.

- In scope: source code, build pipeline, configuration, and dependency risks in this repository.
- Out of scope: private automation repos, personal infrastructure, and secrets not committed here.

## Reporting a Vulnerability

If you discover a security issue, please do not open a public issue with exploit details.

Share a private report that includes:

1. A clear description of the issue.
2. Steps to reproduce.
3. Potential impact.
4. Any suggested mitigation.

You can report through GitHub Security Advisories (preferred) or a private maintainer contact channel.

## What To Expect

- Initial acknowledgement target: within 3 business days.
- Triage target: within 7 business days.
- Fix timelines vary by severity and complexity.

## Secrets and Key Handling

- Never commit credentials, tokens, personal exports, or private webhook URLs.
- Use local env files and hosted secret managers for runtime configuration.
- Use publishable frontend keys only in Vite environment variables.
- Revoke/rotate exposed secret credentials immediately. Supabase publishable keys are intentionally client-visible; their safety depends on correct database access policies.

## Repository Protections

This repo uses:

- CI validation (lint, format, tests, build).
- Automated secret scanning in GitHub Actions.
- PR-based merges. Repository owners must configure and verify branch protection in GitHub; this document does not enforce it.

## Disclosure

After a fix is available, responsible disclosure notes may be published in release notes.

## Public metadata and screenshots

Use a GitHub no-reply commit email when personal email/device names should remain private. Review screenshots visually: token scanners do not reliably detect personal information in images. Generate documentation screenshots only from fictional local fixtures. Deployment identifiers are not credentials, but keep unnecessary operational metadata in private notes. Removing a value in a new commit does not remove it from Git history or existing clones.
