# Chord Seven

Sistema de gestão e consulta de cifras musicais.

Stack alinhada ao monorepo EJC: **npm workspaces**, **Express + Prisma + PostgreSQL**, **React 19 + Vite**, auth **JWT + refresh**.

## Apps

| Pacote | Papel |
|--------|--------|
| `@mucifrar/api` | API REST (público + autenticado) |
| `@mucifrar/web` | SPA — busca/exibição pública e área logada |

## Desenvolvimento

```bash
cp .env.example .env
npm install
npm run docker:up
npm run db:generate
npm run db:push
npm run db:seed

npm run dev:api   # http://localhost:3003
npm run dev:web   # http://localhost:5178
```

**Seed:** `admin@mucifrar.local` / `Admin@123` · `user@mucifrar.local` / `User@123`

## Produção (rede `netsys`)

Usa a infra compartilhada em `/app/netsys-apps/docker-config` (Postgres + Redis + imagens `netsys-node:20` / `netsys-web-nginx:base`).

| Recurso | Valor |
|---------|--------|
| DB / user | `mucifrar` |
| Redis DB | `/6` (reservado; API ainda não usa Redis) |
| API interna | `api:3003` |
| Web (host) | **8095** |

```bash
# 1) Infra compartilhada (uma vez)
cd /app/netsys-apps/docker-config
cp -n .env.example .env   # se ainda não existir
# defina MUCIFRAR_DB_PASSWORD=... no .env
./scripts/build-images.sh   # se as bases ainda não existirem
./scripts/up.sh
./scripts/ensure-app-dbs.sh

# 2) Schema no Postgres shared
cd /app/netsys-apps/mucifrar
# .env de produção: NODE_ENV=production, JWT_*, MUCIFRAR_DB_PASSWORD, CORS_ORIGIN, APP_URL, WEB_PORT=8095
# (DATABASE_URL com host "postgres" é injetada pelo compose — não precisa no .env do host)

# Defina MUCIFRAR_DB_PASSWORD (igual ao docker-config/.env) e rode:
source .env 2>/dev/null || true
../docker-config/scripts/prisma-db-push.sh \
  "$(pwd)/apps/api/prisma" \
  "postgresql://mucifrar:${MUCIFRAR_DB_PASSWORD}@postgres:5432/mucifrar"

# 3) Build e sobe API + nginx
npm run docker:prod
```

Acesso: `http://localhost:8095` (nginx faz proxy de `/api` e `/health` para a API).

Seed opcional (com API já no ar ou via `npx` apontando o DATABASE_URL do shared):

```bash
# exemplo com URL do host (Postgres publicado em 127.0.0.1:5432)
DATABASE_URL="postgresql://mucifrar:SENHA@127.0.0.1:5432/mucifrar" npm run db:seed
```
