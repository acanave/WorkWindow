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

## Secret scanning

GitHub Actions workflow: `.github/workflows/secret-scan.yml`

Triggers:

- Every push to any branch
- Every pull request targeting `main`

Behavior:

- Runs Gitleaks against the repository history and current tree.
- Fails the workflow if a potential secret is detected.

Recommended branch protection addition:

1. Require status check: `Secret Scan / Gitleaks`.

## Release workflow

GitHub Actions workflow: `.github/workflows/release.yml`

- Triggered on semantic version tags (`v*.*.*`) or manual dispatch.
- Re-runs quality gates (`lint`, `format:check`, `test`, `build`).
- Publishes a GitHub Release with immutable build bundle + SHA256 checksum.

### Recommended repository setup

1. Keep `main` protection enabled so only reviewed PRs can land in the release line.
2. Use release tags (`vX.Y.Z`) from `main` only.
3. If manual release dispatch is used, preserve tag naming discipline and changelog notes.

## Main branch protection (classic rule)

Branch protection capabilities can vary by GitHub plan and repository visibility.
If GitHub rulesets or API-based protection management are unavailable on your plan,
configure a classic branch protection rule for `main` directly in the repository settings.

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
