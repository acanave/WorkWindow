# Contributing

## Local setup

```bash
npm install
```

`npm install` runs `prepare`, which installs Husky hooks for this repo.

If hooks are missing for any reason:

```bash
npm run prepare
```

## Local quality workflow

- Pre-commit hook (`.husky/pre-commit`) runs **fast staged-file checks only** via `lint-staged`.
- Staged `*.js,*.jsx,*.ts,*.tsx`: `eslint --fix` then `prettier -w`
- Staged `*.json,*.md,*.yml,*.yaml,*.css,*.scss,*.html`: `prettier -w`
- Full test/build is intentionally **not** part of pre-commit for speed.

### Pre-push gate

- Pre-push hook (`.husky/pre-push`) enforces:
  - Hard block for direct pushes to `main`
  - `npm run test`
  - `npm run build`
- Tests/build currently run for pushes to any branch (fast enough for this repo).

## CI checks

GitHub Actions workflow: `.github/workflows/ci.yml`

Triggers:

- Every push to any branch
- Every pull request targeting `main`

Pipeline order:

1. Install dependencies (based on lockfile)
2. Lint
3. Format check
4. Test
5. Build

Node version resolution:

- `.nvmrc` first
- `package.json` `engines.node` second
- fallback to Node 20

Build artifact policy:

- CI uploads `dist` as an artifact only for pushes to `main`.
- CD promotes that exact artifact to production for repeatable deployments.

## CD workflow

GitHub Actions workflow: `.github/workflows/cd.yml`

Automatic production deploy:

- Trigger: successful `CI` workflow run for a `push` to `main`
- Deploys immutable CI artifact to GitHub Pages
- Uses GitHub `production` environment

Manual production redeploy:

- Trigger: `workflow_dispatch` with a `ref` input
- Rebuilds and deploys from that ref
- Intended for emergency recovery / controlled redeploys

### Required repository setup for CD

1. In **Settings -> Pages**, set source to **GitHub Actions**.
2. In **Settings -> Environments -> production**:
   - add required reviewers (recommended)
   - optionally add a wait timer
3. Keep `main` protection enabled so only reviewed PRs can trigger production deploy.

## Main branch protection (classic rule)

This repository is currently private and GitHub API returns `HTTP 403` for branch
protection/rulesets on the active account plan.

Define a classic branch protection rule for `main` with:

1. Require a pull request before merging.
2. Require status checks to pass before merging.
3. Required check: `CI / Validate`.
4. Block force pushes.
5. Block deletions.

If GitHub shows this as not enforced due plan/account limits, keep the rule as
documented policy and use local enforcement below.

## Local enforcement fallback

1. `.husky/pre-push` blocks any push targeting `main` by default.
2. Direct push override exists for emergencies only and must be deliberate:
   `ALLOW_MAIN_PUSH=1 git push ...`
3. CI (`CI / Validate`) runs on pushes and pull requests to `main`.
