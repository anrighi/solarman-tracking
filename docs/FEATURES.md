# Solar Tracking — Registro funzionalità

> Ultimo aggiornamento: 2026-07-03 | Fase attiva: 2 | Agente: Cursor

## Stato globale
| Fase | Nome | Stato | Completamento |
|------|------|-------|---------------|
| 0 | Bootstrap | done | 100% |
| 1 | Ingestion Solarman | done | 90% |
| 2 | Dashboard | in_progress | 70% |
| 3 | Telegram + AI | pending | 0% |
| 4 | Meteo + Forecast | pending | 0% |

## Fase attiva — cosa fare ora
- Obiettivo corrente: aggregati giorno/settimana/mese (F1) e validazione sync live
- Prerequisiti verificati (env, Docker, test): schema MySQL, client Solarman, sync job, chart Recharts
- Task rimanenti con checkbox:
  - [x] Schema MySQL (`energy_samples_minute`, `sync_state`, `energy_samples_raw`)
  - [x] Client Solarman (token, realtime, history frame)
  - [x] Job sync + script `sync:once` / `sync:backfill` / `sync:worker`
  - [x] Dashboard con grafico produzione/consumo/batteria (24h)
  - [ ] Configurare credenziali Solarman reali in `.env`
  - [ ] Verificare sync live con impianto reale
  - [ ] Aggregati giorno/settimana/mese (F1)
- Blocker aperti: Nessuno

## Feature matrix (dettaglio)

### F0 — Scaffold, Docker, env, regole agent
- Stato: done
- Fase: 0
- File: `package.json`, `docker-compose.yml`, `.env.docker`, `.env.local.example`, `docs/FEATURES.md`, `AGENTS.md`, `.cursor/rules/agent-maintenance.mdc`, `src/lib/env.ts`
- Test: `src/lib/env.test.ts`, `src/lib/solarman/client.test.ts`, `pnpm run build`
- Criteri accettazione: Repo avviabile, container MySQL attivi, dashboard bootstrap caricata, regole agent e env multi-file presenti.

### F1 — Totali giorno/settimana/mese/anno
- Stato: not_started
- Fase: 2
- File: `src/features/energy/...`
- Test: `src/features/energy/...test.ts`
- Criteri accettazione: Aggregati visibili in UI
- Note agente: ...

### F2 — Serie minuto (produzione/consumo/batteria)
- Stato: done
- Fase: 1 + 2
- File: `src/lib/solarman/client.ts`, `src/server/jobs/sync-solarman.ts`, `src/features/energy/components/energy-chart.tsx`
- Criteri accettazione: Dati crudi e normalizzati in DB, cron job attivo.
- Note agente: modalità demo automatica se credenziali Solarman assenti

### F3 — Classificazione consumi via Telegram + AI
- Stato: not_started
- Fase: 3
- File: `src/lib/telegram/bot.ts`, `src/features/classification/service.ts`, `src/lib/llm/openllama-client.ts`

### F4 — Confronto storico con meteo
- Stato: not_started
- Fase: 4
- File: `src/lib/weather/client.ts`

### F5 — Forecast produzione da meteo
- Stato: not_started
- Fase: 4
- File: `src/features/forecast/service.ts`

### F6 — Recap Telegram giornaliero/on-demand
- Stato: not_started
- Fase: 3

## Decisioni architetturali (ADR leggere)
| Data | Decisione | Motivazione | Alternativa scartata |
|------|-----------|-------------|----------------------|
| 2026-06-01 | TanStack Start (RC) | Piattaforma full-stack moderna e reattiva | Next.js (complessità) |
| 2026-06-01 | pnpm | Velocità, supporto monorepo / lockfile pulito | npm / yarn |
| 2026-07-02 | mysql2 raw SQL | Semplicità per fase 1, nessun ORM da configurare | Drizzle (rimandato) |
| 2026-07-02 | Recharts | Grafico rapido per serie temporali in React | Chart.js |
| 2026-07-03 | schema.sql condiviso | Unica DDL per Docker init e migrate runtime | DDL duplicata inline |

## Handoff log (ultime 5 entry)
| Data | Agente | Fase | Fatto | Prossimo passo | Blocker |
|------|--------|------|-------|----------------|---------|
| 2026-07-03 | Cursor | 1+2 | Cleanup fase 1-2, commit logici, dedupe schema/mapping | Aggregati giorno/settimana/mese (F1) | Nessuno |
| 2026-07-03 | Cursor | 1 | Pulizia comandi sync, test sync:once/backfill OK | Aggregati giorno/settimana/mese (F1) | Nessuno |
| 2026-05-31 | Cursor | 0 | Chiusura Fase 0: regole agent, env multi-file, test env, README, build OK | Avviare Docker Desktop e `docker compose up -d` per verifica runtime | Docker daemon non attivo in CI locale |
| 2026-07-02 | Cursor | 1+2 | Sync Solarman + grafico 24h dashboard | Inserire credenziali Solarman e validare dati live | Nessuno |
| 2026-06-01 | Antigravity | 0 | Setup progetto base | Avviare docker compose e verificare pagina iniziale | Nessuno |

## Comandi utili per riprendere
- `docker compose up -d`
- `pnpm run test`
- `pnpm run sync:once`
- `pnpm run sync:backfill` — ultimi 7 giorni (default)
- `pnpm run sync:backfill 1 1` — solo ieri
- `pnpm run sync:worker`
- `pnpm run dev`
