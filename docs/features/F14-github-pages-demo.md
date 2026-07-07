# F14 — Published demo on GitHub Pages

| Field | Value |
|-------|-------|
| Status | not_started |
| Phase | 0+ (discoverability) |
| Files | `docs/demo/` or `demo/`, `.github/workflows/pages.yml`, `README.md` |
| Tests | Smoke test that demo assets build; optional Playwright snapshot of static pages |

## Goal

Publish a **read-only public demo** of the dashboard on GitHub Pages so visitors can explore the UI without cloning the repo, Docker, or Solarman credentials.

## Constraints

| Constraint | Implication |
|------------|-------------|
| GitHub Pages is static | No MySQL, sync worker, or server functions at runtime |
| No secrets on Pages | Demo must use bundled mock data only |
| Production app is localhost-only | Demo is a separate deploy path, not the self-hosted stack |
| Italian UI | Demo keeps Italian labels; docs stay English |

## Proposed approach

### Option A — Static dashboard snapshot (recommended v1)

1. Add a `demo/` or `docs/demo/` SPA built from shared chart/KPI components
2. Ship anonymized sample JSON (1–7 days of minute samples + battery series)
3. `vite build` with `base: '/solarman-tracking/'` (match repo name on GitHub Pages)
4. GitHub Actions workflow: build demo → deploy `dist/` to `gh-pages` branch or Pages artifact

### Option B — Storybook / component gallery

Lighter weight: isolated chart and KPI stories with mock props. Less impressive for end users but faster to ship.

**Decision:** start with **Option A** for README screenshots and discoverability; Option B only if full dashboard extract is too coupled to server loaders.

## Deliverables

- [ ] Mock dataset (`demo/fixtures/` or `public/demo-data.json`) — no real plant identifiers
- [ ] Demo entry route or standalone Vite app reusing `src/features/energy/` presentation components
- [ ] Banner: “Dati dimostrativi — non collegato a Solarman”
- [ ] `.github/workflows/pages.yml` — build + deploy on push to `main` (path filter: `demo/**`, shared components)
- [ ] README link: “[Live demo](https://anrighi.github.io/solarman-tracking/)”
- [ ] Social preview / README screenshots generated from the same demo build

## Out of scope (v1)

- Live Solarman connection from Pages
- Settings, sync, backup, Telegram in the public demo
- Authentication (demo is public read-only)

## Prerequisites

| Dependency | Why |
|------------|-----|
| F2 minute series | Chart components and series shape |
| F9 battery dashboard | Battery chart reuse |
| F13 CI (optional) | Validate demo build in PRs before deploy |

## Open questions

- Extract shared UI into `src/features/energy/components/` with zero server imports, or fork minimal demo components?
- Custom domain vs default `*.github.io` URL?
- Deploy on every `main` push or manual `workflow_dispatch` only?

## Acceptance criteria

1. Public URL loads dashboard with mock data in &lt; 3s on typical connection
2. No env vars or API keys in the published bundle
3. README and CONTRIBUTING reference the demo URL
4. `pnpm run build:demo` (or equivalent) works locally without Docker/MySQL
