# F13 — Static analysis and GitHub CI pipeline

| Field | Value |
|-------|-------|
| Status | not_started |
| Phase | 0+ (cross-cutting) |
| Files | `.github/workflows/ci.yml`, `eslint.config.js`, `package.json`, `tsconfig.json` |
| Tests | CI itself; existing `src/**/*.test.ts` run in pipeline |

## Goal

Catch regressions before merge: every PR and push to `main` runs typecheck, lint, unit tests, and production build in GitHub Actions — no secrets, no external services.

## Current baseline

| Tool | Status |
|------|--------|
| Vitest | Configured in `vite.config.ts`; 9 test files under `src/` |
| TypeScript strict | `tsconfig.json` (`strict`, `noUnusedLocals`, etc.) |
| ESLint / Prettier | Not configured |
| GitHub Actions | No `.github/workflows/` |
| Local `ci` script | Not defined |

## Pipeline design

### Triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### Jobs (single workflow, parallel where possible)

| Job | Command | Purpose |
|-----|---------|---------|
| `typecheck` | `pnpm exec tsc --noEmit` | Strict TS without emit |
| `lint` | `pnpm run lint` | ESLint + import rules |
| `format` | `pnpm run format:check` | Prettier diff check (no write) |
| `test` | `pnpm run test` | Vitest unit tests (node env) |
| `build` | `pnpm run build` | Vite production build |

`build` depends on `typecheck`, `lint`, `test` passing (or runs after them in sequence if simpler).

### Runner environment

- `ubuntu-latest`
- Node 22 (match `@types/node`)
- `pnpm` via `pnpm/action-setup` with version from `packageManager` field
- Cache: `pnpm store` + `node_modules` keyed on `pnpm-lock.yaml`

### Secrets and services

- **None required** for v1 — tests mock Solarman, Telegram, MySQL
- Optional later job: integration tests with MySQL service container (deferred)

## Tooling to add

### ESLint (flat config)

Packages:

- `eslint`
- `@eslint/js`
- `typescript-eslint`
- `eslint-plugin-react-hooks` (React 19)
- `eslint-import-resolver-typescript` + `eslint-plugin-import` (enforce `@/` absolute imports)

Rules aligned with project conventions:

- TypeScript recommended + strict
- `no-unused-vars` via typescript-eslint
- Prefer early return (no mandatory rule — keep lint practical)
- Absolute imports `@/*` only in `src/`

### Prettier

- `prettier` + `prettier-plugin-tailwindcss` (optional, for class sorting)
- `.prettierignore`: `dist`, `node_modules`, `src/routeTree.gen.ts`

### package.json scripts

```json
{
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "ci": "pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test && pnpm run build"
}
```

`ci` mirrors the GitHub workflow for local pre-push checks.

## Workflow file sketch

```
.github/workflows/ci.yml
```

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck
      - run: pnpm run lint
      - run: pnpm run format:check
      - run: pnpm run test
      - run: pnpm run build
```

## Branch protection (manual GitHub settings)

After first green run on `main`:

- Require status check **CI / quality** before merge
- Require branches up to date (optional)
- No force-push to `main`

Document in `README.md` under **Development** (when implemented).

## Acceptance criteria

- [ ] `.github/workflows/ci.yml` runs on PR and push to `main`
- [ ] `pnpm run ci` passes locally with zero warnings policy (or documented exceptions)
- [ ] ESLint flat config covers `src/`, `scripts/`, config files
- [ ] Prettier check fails CI on unformatted files
- [ ] `tsc --noEmit` in CI (add explicit script)
- [ ] Vitest + build green without `.env` secrets
- [ ] README documents local `pnpm run ci` and branch protection steps
- [ ] `agent-maintenance.mdc` / `commit-convention.mdc` reference `pnpm run ci` instead of separate test+build only

## Non-goals (v1)

- Code coverage thresholds / Codecov upload
- MySQL service container integration tests
- Docker image build in CI
- Dependabot auto-merge
- SAST beyond ESLint (Semgrep, CodeQL — optional later)
- Deploy workflow (app is local-only)

## Optional follow-ups (v2)

| Item | Notes |
|------|-------|
| `pnpm audit --audit-level=high` | Fail on high/critical; may need periodic baseline |
| CodeQL | Free for public repos; security scanning |
| Husky + lint-staged | Pre-commit hook mirroring `format:check` + `lint` on staged files |
| Matrix Node 22 + 24 | Only if multi-version support needed |

## Notes

- Can be implemented independently of product phases; recommended after F1 stabilizes or in parallel with low risk.
- Generated files (`src/routeTree.gen.ts`) must be excluded from lint/format or committed consistently.
- Keep CI fast (&lt; 3 min): no Docker, no network calls in unit tests.
