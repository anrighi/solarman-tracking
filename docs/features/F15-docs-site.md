# F15 — Documentation site (guides + reference)

| Field | Value |
|-------|-------|
| Status | not_started |
| Phase | 0+ (discoverability) |
| Files | `docs-site/` (or `website/`), `.github/workflows/docs.yml`, `README.md` |
| Tests | Link check in CI; build step in `pnpm run build:docs` |

## Goal

Publish a **static documentation site** for Solar Tracking — separate from the self-hosted app — so **end users** and **developers** can find setup, usage, and technical reference without reading scattered repo files.

Italian for app UI; **docs site in English** (consistent with README, feature specs, commits).

## Audience

| Audience | Needs |
|----------|--------|
| **End user** (plant owner) | First-time install, Docker vs local dev, Solarman credentials, dashboard tour, settings, backup restore, Telegram alerts, troubleshooting |
| **Developer / contributor** | Architecture overview, repo layout, env vars, commands, testing, phases/roadmap, how to add a feature, CI, database schema, API/sync internals |

## Proposed site structure

```
/
├── getting-started/
│   ├── overview
│   ├── requirements
│   ├── docker-install          ← from docs/INIT.md
│   ├── local-development
│   └── solarman-credentials
├── user-guide/
│   ├── dashboard
│   ├── settings
│   ├── sync-and-backfill
│   ├── backup-and-restore      ← from docs/BACKUP.md if present
│   ├── telegram-notifications
│   └── faq-troubleshooting
├── developer/
│   ├── architecture
│   ├── project-structure
│   ├── configuration           ← app_config vs .env
│   ├── database
│   ├── sync-pipeline
│   ├── testing-and-ci
│   └── contributing            ← link/summary of CONTRIBUTING.md
├── features/                   ← human-readable index; link to F*.md sources
│   ├── roadmap
│   └── per-feature pages (generated or hand-maintained summaries)
└── reference/
    ├── cli-commands
    ├── environment-variables
    └── config-keys             ← app_config schema labels
```

## Content sources (migrate, don’t duplicate forever)

| Existing doc | Site section |
|--------------|--------------|
| `README.md` | Overview, quick links |
| `docs/INIT.md` | Getting started |
| `docs/FEATURES.md` | Roadmap / phases |
| `docs/features/F*.md` | Feature reference (summaries; deep link to repo for agents) |
| `docs/BACKUP.md` | User backup guide |
| `AGENTS.md` / `CONTRIBUTING.md` | Developer contributing |
| `.env.example` | Env reference table |

Prefer **single source of truth**: either symlink/copy at build time, or generate pages from markdown in `docs/`. Avoid maintaining the same prose in three places.

## Tooling options

| Option | Pros | Cons |
|--------|------|------|
| **VitePress** (recommended) | Vue/Vite ecosystem, fast, markdown-native, good search | New toolchain in repo |
| Docusaurus | Rich features, versioning | Heavier |
| MkDocs Material | Simple, Python | Extra runtime in CI |

**Decision (proposed):** VitePress in `docs-site/`, content rooted in `docs/` where possible.

## Hosting

- **GitHub Pages** at `https://anrighi.github.io/solarman-tracking/docs/` (or `/` with path routing — coordinate with F14 demo URL)
- Workflow `.github/workflows/docs.yml`: `pnpm run build:docs` → deploy artifact
- Optional: custom domain later

### Relationship to F14

| F14 | F15 |
|-----|-----|
| Interactive **demo** (mock dashboard) | **Documentation** (guides + reference) |
| Same Pages project possible | Use `base` paths: `/demo/` vs `/docs/` or subdomains |

## Deliverables

- [ ] VitePress (or chosen SSG) scaffold under `docs-site/`
- [ ] `pnpm run dev:docs` and `pnpm run build:docs`
- [ ] Getting started + user guide (minimum viable: INIT flow, dashboard, settings)
- [ ] Developer section (architecture diagram, commands, contributing)
- [ ] Feature roadmap page synced from `docs/FEATURES.md` (manual or build script)
- [ ] Env + `app_config` reference tables
- [ ] GitHub Actions deploy on `main` (path filter: `docs/**`, `docs-site/**`)
- [ ] README badge/link: “Documentation”
- [ ] Search (VitePress local search)
- [ ] Italian UI screenshot captions where helpful; prose stays English

## Acceptance criteria

1. New user can complete Docker setup using only the published site (no repo clone required for instructions)
2. Contributor can find branch naming, test commands, and phase rules
3. Site builds in CI without secrets
4. No credentials or plant-specific data in published content
5. Links to live demo (F14) when available

## Prerequisites

| Dependency | Why |
|------------|-----|
| Stable `docs/INIT.md` | Core install guide |
| Phase 2 dashboard done | User guide screenshots |
| F13 CI (optional) | Docs build in PR checks |
| F14 (optional) | Cross-link demo from docs home |

## Out of scope (v1)

- Versioned docs per release (single `main` docs until tags matter)
- Italian translation of full site (UI stays Italian; docs English only)
- Auto-generated OpenAPI (no public HTTP API today)
- Embedded app (settings/sync) in docs — static only

## Open questions

- Monorepo `docs-site/` vs publish directly from `/docs` with VitePress `srcDir`?
- Generate feature pages from `scripts/github-tasks.manifest.json`?
- Include mermaid architecture diagrams in repo and render on site?
