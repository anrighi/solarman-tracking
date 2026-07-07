# Contributing

Thanks for your interest in Solar Tracking. This project is built for Solarman PV owners who self-host on localhost.

## Before you start

1. Pick an **open feature issue** on [GitHub](https://github.com/anrighi/solarman-tracking/issues?q=is%3Aopen+is%3Aissue+label%3Afeature) (`[Fx]` title prefix)
2. Confirm the issue **phase** matches the active phase in [docs/FEATURES.md](docs/FEATURES.md)
3. Read the linked **spec** in `docs/features/F*.md`
4. Comment on or assign the issue, then branch from `main`
5. Follow [AGENTS.md](AGENTS.md) and `.cursor/rules/github-workflow.mdc`

## Branch and PR workflow

| Step | Action |
|------|--------|
| Branch | `phase-<n>/<id>-<slug>` e.g. `phase-3/f3-classification` |
| Work | Implement against the issue + spec |
| Complete | Set `"status": "done"` in `scripts/github-tasks.manifest.json` and spec file |
| PR | Target `main`, body includes `Closes #<issue-number>` |
| Merge | CI on `main` re-syncs GitHub Issues from the manifest |

PR template: [.github/pull_request_template.md](.github/pull_request_template.md)

## Development setup

```bash
pnpm install
docker compose up -d
pnpm run test
pnpm run dev
```

## Pull requests

- One feature per branch and PR (preferred)
- Branch name: `phase-<n>/<id>-<slug>`
- PR body must include `Closes #N` for completed features
- Keep changes focused; conventional commits: `feat(scope): description`
- UI text in **Italian**; docs and commits in **English**
- Run `pnpm run test` (and `pnpm run build` if application code changed)
- Update `docs/features/F*.md`, `scripts/github-tasks.manifest.json`, and handoff log when completing a feature

## Reporting issues

Use the GitHub issue templates. Include:

- Solarman station type (if known)
- Docker vs local dev
- Steps to reproduce
- Relevant logs (redact secrets)

## GitHub task sync

**Automatic:** push to `main` updates issues when `scripts/github-tasks.manifest.json` or `docs/features/**` change (workflow: `.github/workflows/sync-github-tasks.yml`).

**Manual** (local or after editing specs):

```bash
./scripts/sync-github-tasks.sh
```

Issue bodies include summary, acceptance criteria, deliverables, files, and suggested branch — generated from `docs/features/*.md` via `scripts/render-github-issue-body.ts`.

The script resolves the repo from `git remote` / `gh repo view` (manifest `repo` is fallback only).

If you see `HTTP 404` on labels or issues:

```bash
gh auth status
gh api user --jq .login          # should match repo owner or a collaborator
gh api repos/anrighi/solarman-tracking --jq .full_name
gh auth refresh -s repo,project  # grant issue/label/project scopes
```

## Repository discoverability (maintainers)

If you have admin access, set these in **GitHub → Settings → General**:

**Description:**

```
Self-hosted Solarman PV monitoring: local dashboard, battery Telegram alerts, Docker + MySQL
```

**Topics:**

`solar`, `photovoltaic`, `solarman`, `energy-monitoring`, `battery-monitoring`, `self-hosted`, `docker`, `typescript`, `react`, `mysql`, `telegram-bot`, `renewable-energy`, `github-pages`

**Social preview:** upload a 1280×640 image (logo + tagline) under **Settings → General → Social preview**.

**Screenshots:** add `docs/images/dashboard.png` (and others) and uncomment the image block in `README.md`.

**Documentation site (planned):** [F15](docs/features/F15-docs-site.md) — published guides for end users and developers (VitePress + GitHub Pages). Until then, use `docs/INIT.md`, `docs/FEATURES.md`, and per-feature specs in `docs/features/`.
