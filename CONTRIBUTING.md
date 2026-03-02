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

### Optional pre-push gate

- Pre-push hook (`.husky/pre-push`) runs:
  - `npm run test`
  - `npm run build`
- This is a stronger local safety net before code leaves your machine.

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

## Recommended branch protection for `main` (manual GitHub settings)

1. Require pull request before merging.
2. Require status checks to pass before merging.
3. Select required check: `CI / Validate`.
4. Require branches to be up to date before merging.
5. Restrict force pushes and branch deletions on `main`.
