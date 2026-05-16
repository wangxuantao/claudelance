# Database Stack

Shared database layer for HomeLab Stack. All services share these instances.

## Services

| Service | Image | Port | Access |
|---------|-------|------|--------|
| PostgreSQL | postgres:16.4-alpine | 5432 (internal) | `postgres:5432` |
| Redis | redis:7.4.0-alpine | 6379 (internal) | `redis:6379` |
| MariaDB | mariadb:11.5.2 | 3306 (internal) | `mariadb:3306` |
| pgAdmin | dpage/pgadmin4:8.11 | 80 | `pgadmin.${DOMAIN}` |
| Redis Commander | rediscommander/redis-commander | 8081 | `redis.${DOMAIN}` |

## Quick Start

```bash
docker compose up -d
../../scripts/init-databases.sh
```

## Redis Database Allocation

| DB | Service |
|----|---------|
| 0 | Authentik |
| 1 | Outline |
| 2 | Gitea |
| 3 | Nextcloud |
| 4 | Grafana sessions |

Usage: `redis://:${REDIS_PASSWORD}@redis:6379/0`

## Connection Strings

| Service | Connection |
|---------|-----------|
| Nextcloud | `pgsql://nextcloud:${NEXTCLOUD_DB_PASSWORD}@postgres:5432/nextcloud` |
| Gitea | `postgres://gitea:${GITEA_DB_PASSWORD}@postgres:5432/gitea?sslmode=disable` |
| Outline | `postgres://outline:${OUTLINE_DB_PASSWORD}@postgres:5432/outline` |
| Authentik | `postgresql://authentik:${AUTHENTIK_DB_PASSWORD}@postgres:5432/authentik` |
| Grafana | `postgres://grafana:${GRAFANA_DB_PASSWORD}@postgres:5432/grafana` |
| Vaultwarden | `mysql://vaultwarden:${VAULTWARDEN_DB_PASSWORD}@mariadb:3306/vaultwarden` |

## Network

Database containers are on the `databases` internal bridge network — NOT exposed to host. Only pgAdmin and Redis Commander join the `proxy` network for Traefik access.

## Backup

```bash
../../scripts/backup-databases.sh           # Local backup
../../scripts/backup-databases.sh --upload  # + MinIO upload
```

Backups kept for 7 days, stored in `backups/`.

## CN Mirror

| Original | Mirror |
|----------|--------|
| postgres:16.4-alpine | docker.m.daocloud.io/postgres:16.4-alpine |
| redis:7.4.0-alpine | docker.m.daocloud.io/redis:7.4.0-alpine |
| mariadb:11.5.2 | docker.m.daocloud.io/mariadb:11.5.2 |
| dpage/pgadmin4:8.11 | docker.m.daocloud.io/dpage/pgadmin4:8.11 |
