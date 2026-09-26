# Chord Seven

Sistema de gestão e consulta de cifras musicais.

Stack alinhada ao monorepo EJC: **npm workspaces**, **Express + Prisma + PostgreSQL**, **React 19 + Vite**, auth **JWT + refresh**.

## Apps

| Pacote | Papel |
|--------|--------|
| `@mucifrar/api` | API REST (público + autenticado) |
| `@mucifrar/web` | SPA única — busca/exibição pública e área logada no mesmo módulo |

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
