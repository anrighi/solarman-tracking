# Security policy

## Supported versions

Security fixes are applied on the `main` branch. There are no long-term release branches yet.

## Reporting a vulnerability

This app is designed for **localhost-only** use (`127.0.0.1`). Do not expose it directly to the internet without a reverse proxy, authentication, and TLS.

If you find a security issue:

1. **Do not** open a public GitHub issue for sensitive findings
2. Contact the repository owner privately (GitHub security advisory or direct message)
3. Include steps to reproduce and impact assessment

## Scope notes

- Secrets (Solarman, Telegram, MySQL) belong in `.env` / `.env.local` — never commit them
- Tunables live in the `app_config` database table, not in env files
- Backup dumps may contain production data; store them securely

We aim to acknowledge reports within a reasonable timeframe and patch confirmed issues on `main`.
