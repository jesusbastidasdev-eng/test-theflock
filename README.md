# Chirp — Twitter clone (The Flock challenge)

Full-stack Twitter/X-style app: **Next.js 15 (App Router)** frontend, **Fastify + Prisma + PostgreSQL** API, **cookie sessions** with **Argon2** password hashing. AI-friendly monorepo layout with tests and a copy-paste runbook.

## Why this stack

- **Next.js**: fast UI iteration, mobile-first responsive layouts, built-in API **rewrites** so the browser talks to **same-origin `/api/*`** while Fastify runs on another port (cookies work on `localhost` without `SameSite=None`).
- **Fastify**: small, explicit HTTP layer, great for integration tests via `inject()`.
- **PostgreSQL + Prisma**: relational integrity for follows/likes, easy seeds, case-insensitive search (`mode: 'insensitive'`).

## Architecture

- **Timeline**: tweets whose `authorId` is in \(\{\text{viewer}\} \cup \text{following}\), ordered by `(createdAt DESC, id DESC)`, **cursor pagination** by last tweet id (stable when new tweets arrive).
- **Follow graph**: `Follow` rows: `followerId` → `followingId`, unique pair.
- **Auth**: `POST /api/auth/register` / `login` create a `Session` row; **httpOnly** `session_token` cookie; `getUserFromSessionToken` loads user or clears expired session.

## Prerrequisitos (versiones usadas en desarrollo)

| Herramienta | Versión |
|-------------|---------|
| Node.js | **20.x** (LTS) |
| npm | **10.x** |
| PostgreSQL | **16.x** (o usar Docker abajo) |
| Docker Desktop / Engine | **24+** (solo si usás `docker compose`) |

## Setup (Runbook)

### 1. Clonar e instalar

```bash
git clone <TU_REPO_URL> chirp
cd chirp
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env
# Editá .env si tu Postgres no usa los valores por defecto del compose.
```

Colocá **`DATABASE_URL`**, **`WEB_ORIGIN`**, **`API_PORT`** (y lo demás) en el **`.env` en la raíz del monorepo** (junto a este README). El API **carga ese archivo al arrancar**, así que **`echo "$DATABASE_URL"` puede estar vacío** en la terminal y aun así el servidor verá la variable.

Los scripts `npm run db:*` en `apps/api` usan **`dotenv -e ../../.env`**, así que ` prisma db push` / seed también encuentran `DATABASE_URL` sin `export`.

Si preferís la shell explícita (opcional):

```bash
export DATABASE_URL="postgresql://chirp:chirp@127.0.0.1:5432/chirp?schema=public"
export API_PORT=4000
export WEB_ORIGIN=http://127.0.0.1:3000
```

Para el frontend (`apps/web`):

```bash
export API_ORIGIN=http://127.0.0.1:4000
```

### 3. Base de datos

**Opción A — Docker (recomendado)**

```bash
docker compose up -d
# Esperá "healthy" (unos segundos)
```

**Opción B — Postgres local**

Creá DB/usuario equivalente a `DATABASE_URL` del `.env.example`.

Ejemplo para Postgres local si querés usar exactamente el `.env.example`:

```bash
psql -h 127.0.0.1 -U postgres -d postgres
```

Luego, dentro de `psql`:

```sql
CREATE ROLE chirp WITH LOGIN PASSWORD 'chirp';
CREATE DATABASE chirp OWNER chirp;
\q
```

Verificación rápida:

```bash
psql "postgresql://chirp:chirp@127.0.0.1:5432/chirp?schema=public" -c "SELECT 1"
```

Si usás otro usuario / password / nombre de base, actualizá `DATABASE_URL` en `.env` para que coincida con tu instalación local.

### 4. Esquema Prisma

```bash
cd apps/api
npm run db:generate
npm run db:push
```

(Usá estos scripts para que lean `../../.env`; si corrés `npx prisma` a mano, exportá `DATABASE_URL` o usá `dotenv -e ../../.env -- …`.)

### 5. Semilla de datos

```bash
cd apps/api
npm run db:seed
```

Esto crea **11 usuarios**, tweets, follows cruzados y likes.

### 6. Desarrollo (API + Web)

En **dos terminales** desde la raíz `chirp/`:

```bash
# Terminal 1 — con .env en la raíz no hace falta exportar DATABASE_URL / WEB_ORIGIN
npm run dev -w @twitter-clone/api
```

```bash
# Terminal 2
export API_ORIGIN=http://127.0.0.1:4000
npm run dev -w @twitter-clone/web
```

Abrí **http://127.0.0.1:3000** (usá la misma IP que `WEB_ORIGIN` para que las cookies coincidan).

### 7. Tests

```bash
# Backend (cobertura ~80%+ líneas con mocks + smoke; integración opcional con DB real)
export DATABASE_URL="postgresql://chirp:chirp@127.0.0.1:5432/chirp?schema=public"
npm run test -w @twitter-clone/api -- --coverage

# Integración extra (requiere DB); sin DATABASE_URL esos tests se omiten
# (los unit/smoke ya corren igual)

# Frontend (Vitest + Testing Library)
npm run test:unit -w @twitter-clone/web

# E2E (Playwright; levanta API+Web solos — requiere DB accesible y `prisma db push` hecho)
export DATABASE_URL="postgresql://chirp:chirp@127.0.0.1:5432/chirp?schema=public"
npm run test:e2e
```

## Credenciales de ejemplo (seed)

Tras `npm run db:seed`:

| Campo | Valor |
|-------|--------|
| Email | `alice@example.com` |
| Password | `Password123!` |

(Todos los usuarios seed comparten la misma contraseña para facilitar pruebas.)

## Features implementadas (obligatorias)

- Registro / login / logout, rutas protegidas en el cliente, `/api/*` valida sesión.
- Perfil: username único, bio, avatar placeholder (iniciales).
- Tweets 280 chars, borrar propios, timeline de seguidos + vos, paginación “Load more”.
- Follow / unfollow, likes con contador, listas followers/following en perfil.
- Búsqueda de usuarios por email o username.
- UI responsive mobile-first (`sm` / `md` breakpoints).

## Bonus

- `docker-compose.yml` levanta PostgreSQL con un solo comando.

## AI / agentic coding

Desarrollado con asistencia de Cursor/LLM: scaffolding monorepo, rutas CRUD, mocks de Prisma para cobertura, y runbook explícito. Revisión humana recomendada en auth, CORS y despliegue.

## Historial de commits (sugerido para la entrega)

Para alinearte con la rúbrica: *scaffolding → modelo/DB → auth backend → auth frontend + E2E → tweets + tests → timeline UI → follows/likes + tests → perfil/búsqueda → responsive → seed + README + `.env.example`*. Evitá un squash final; commits pequeños y mensajes descriptivos.

## Trade-offs conocidos

- Sin refresco en tiempo real del timeline (bonus no implementado).
- Feed de perfil muestra tweets de ese usuario (no “con respuestas” estilo X).
- E2E asume Postgres disponible; CI debe exportar `DATABASE_URL` o levantar servicio.

## Qué se corrigió durante el setup

- El API ahora carga el `.env` de la raíz del monorepo al arrancar, así que no dependés de hacer `export DATABASE_URL` en cada terminal.
- Los scripts `npm run db:generate`, `db:push`, `db:seed` y `db:migrate` en `apps/api` leen `../../.env` con `dotenv`, para que Prisma use la misma configuración que el servidor.
- El seed también carga el mismo `.env`, evitando errores por `DATABASE_URL` faltante.
- Si aparece `P1010: User was denied access on the database`, el problema ya no es el loader de variables sino las credenciales reales de Postgres en `DATABASE_URL`.
- El proyecto usa `127.0.0.1` en la documentación para mantener consistencia entre cookies, `WEB_ORIGIN` y la URL del frontend.

## Troubleshooting rápido

- `echo "$DATABASE_URL"` vacío: no necesariamente es un problema. Si existe `.env` en la raíz, el API y los scripts Prisma igual lo cargan.
- `npm run db:push` o `npm run db:seed` falla con `P1010`: revisá usuario, password, DB y permisos del Postgres local.
- `docker compose up -d` falla con socket / daemon: Docker es opcional; podés usar Postgres local.
- Login o signup devuelve 500 por Prisma: confirmá primero que `npm run db:push` y `npm run db:seed` hayan corrido bien contra la misma `DATABASE_URL`.

## Estructura

- `apps/web` — Next.js UI
- `apps/api` — Fastify + Prisma
- `tests/e2e` — Playwright
- `.env.example` — variables documentadas
