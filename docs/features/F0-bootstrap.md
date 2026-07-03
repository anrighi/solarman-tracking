# F0 — Scaffold, Docker, env, agent rules

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 0 |
| Files | `package.json`, `docker-compose.yml`, `.env.docker`, `.env.local.example`, `docs/`, `AGENTS.md`, `.cursor/rules/`, `src/lib/env.ts` |
| Tests | `src/lib/env.test.ts`, `pnpm run build` |

## Acceptance criteria

- Repo runnable with Docker Compose
- MySQL container healthy
- Dashboard bootstrap loads
- Agent rules and multi-file env present
- MIT license in `LICENSE`
