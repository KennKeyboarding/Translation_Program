# Remote SSH + Docker Context (for AI Coding IDE)

Last verified: 2026-04-16 (Asia/Shanghai)

## 1) SSH Connection

- Connection name: `aliyun_cllmsdocker`
- Host: `8.159.140.250`
- Port: `22`
- Username: `dase`
- Auth: password
- Password: `dase@cog2025!`
- Hostname after login: `iZuf67gbpvg3whvdp3a45jZ`

Quick connect:

```bash
ssh dase@8.159.140.250
```

## 2) Docker Runtime Snapshot

`docker ps` (verified):

- `my-nginx-proxy` | `nginx:latest` | Up
- `data-db-1` | `postgres:16` | Up (healthy)
- `backend_development` | `ubuntu2204-anaconda20250601:1.1` | Up
- `backend_production` | `ubuntu2204-anaconda20250601:1.0` | Up

## 3) Development Container (primary)

- Container name: `backend_development`
- Default command: `["/bin/bash"]`
- WorkingDir: empty (`/` at runtime)
- Mount:
  - Host: `/data/development/backend/workspaces`
  - Container: `/workspaces`

Enter container:

```bash
docker exec -it backend_development bash
```

Useful path:

```bash
cd /workspaces
ls -la
```

## 4) Database Access

### 4.1 From local machine (via SSH tunnel)

Local tunnel command:

```bash
ssh -N -L 15432:127.0.0.1:5432 dase@8.159.140.250
```

Then connect:

```bash
PGPASSWORD='devpass' psql -h 127.0.0.1 -p 15432 -U devuser -d developmentdb
```

### 4.2 DB credentials

- DB user: `devuser`
- DB password: `devpass`
- DB names seen: `developmentdb`, `postgres`, `stabledb`

### 4.3 From `backend_development` container

- `data-db-1:5432` is reachable from container network
- `127.0.0.1:5432` in container is not the DB container
- `psql` is not installed in `backend_development`
- `psycopg2` is not installed in `backend_development`

## 5) Reusable command templates

List running containers:

```bash
ssh dase@8.159.140.250 "docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}'"
```

Run command inside dev container:

```bash
ssh dase@8.159.140.250 "docker exec backend_development bash -lc 'cd /workspaces && ls -la'"
```

DB health check from remote host:

```bash
ssh dase@8.159.140.250 "docker exec data-db-1 pg_isready -U devuser -d developmentdb"
```

## 6) Notes for AI IDE

- Prefer `backend_development` for application-level operations.
- Prefer local `psql` + SSH tunnel for SQL tasks (fast and stable).
- If running Python SQL inside container, install driver first (`psycopg2`/`psycopg`).
- Keep this file updated whenever host, credentials, mounts, or container names change.
