# Solar Tracking

Piattaforma locale per monitoraggio impianto fotovoltaico: sync dati Solarman, dashboard energetica, classificazione consumi via Telegram + AI locale.

Documentazione avanzamento: [`docs/FEATURES.md`](docs/FEATURES.md)

## Requisiti

- Node.js 22+
- pnpm
- Docker + Docker Compose

## Configurazione env

| File | Uso |
|------|-----|
| `.env.example` | Template generale (riferimento) |
| `.env.local.example` | Dev locale → copiare in `.env.local` |
| `.env.docker` | Usato da Docker Compose (committato) |
| `.env` / `.env.local` | Credenziali reali — **non committare** |

```bash
cp .env.local.example .env.local
# oppure
cp .env.example .env
```

## Avvio rapido

### Stack Docker (consigliato)

```bash
docker compose up -d
```

Servizi: `app` (http://127.0.0.1:3000), `worker`, `mysql`.

Per LLM e bot Telegram (fase 3):

```bash
docker compose --profile full up -d
```

### Dev locale (fuori Docker)

```bash
pnpm install
docker compose up -d mysql   # solo DB
pnpm dev
```

## Comandi

```bash
pnpm run dev           # server dev
pnpm run build         # build produzione
pnpm run test          # test con mock
pnpm run sync:once     # sync singola Solarman
pnpm run sync:backfill # backfill storico
pnpm run sync:worker   # worker cron continuo
```

## Architettura

- **Frontend/API**: TanStack Start + React (TypeScript)
- **DB**: MySQL 8 (dati minuto + aggregati)
- **Sync**: worker cron (no live API)
- **AI**: OpenLLaMA locale in Docker (fase 3)
- **UI**: italiano, accesso solo localhost

## Per agenti

1. Leggere `docs/FEATURES.md` e `.cursor/rules/agent-maintenance.mdc`
2. Seguire `AGENTS.md`
3. Aggiornare handoff log a fine sessione
