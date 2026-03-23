# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (no user key required)
- **Auth**: Replit Auth (OIDC/PKCE)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── resume-matcher/     # Resume-JD Matcher web app (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server-side integration
│   ├── integrations-openai-ai-react/   # OpenAI React integration
│   └── replit-auth-web/    # Replit Auth web browser package
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Application: Resume-JD Matcher

AI-powered resume-to-job description matching app.

### Features
- **Authentication**: Replit Auth (login/logout, persistent sessions via DB)
- **Resume Upload**: PDF upload with text extraction (pdf-parse)
- **Job Description Input**: Paste/type long-form JDs with optional job title + company
- **AI Workflow Engine** (5 steps via OpenAI gpt-5.2):
  1. Extract resume text from PDF
  2. Parse resume into structured profile
  3. Parse JD into structured requirements
  4. Match resume against JD (score, strengths, gaps, keywords)
  5. Generate recommendations (resume rewrites, keywords, interview prep, pitch)
- **Results Dashboard**: Match score, decision hint, strengths, gaps, missing keywords, interview areas, recommendations
- **History**: View and delete past analyses

### Pages
- `/` — Landing page (public)
- `/analyze` — Upload resume + input JD (auth required)
- `/analyses/:id/processing` — Processing state with step-by-step progress
- `/analyses/:id/results` — Full results dashboard
- `/history` — Past analyses library

### API Endpoints
- `GET /api/auth/user` — Auth state
- `GET /api/login` — OIDC login redirect
- `GET /api/callback` — OIDC callback
- `GET /api/logout` — Logout
- `GET /api/analyses` — List user analyses
- `POST /api/analyses` — Create analysis (multipart/form-data: resume + jobDescription)
- `GET /api/analyses/:id` — Full analysis details
- `GET /api/analyses/:id/status` — Processing status (for polling)
- `DELETE /api/analyses/:id` — Delete analysis

### Database Tables
- `users` — User records from Replit OIDC
- `sessions` — Auth sessions
- `analyses` — Resume-JD match analyses with full results

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists lib packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — cross-package dependencies must be declared

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with auth, PDF parsing, and AI workflow.

- Entry: `src/index.ts`
- App: `src/app.ts` — CORS, cookies, JSON, auth middleware, routes at `/api`
- Routes: `src/routes/health.ts`, `src/routes/auth.ts`, `src/routes/analyses.ts`
- AI: `@workspace/integrations-openai-ai-server` (gpt-5.2 for all workflow steps)
- PDF: `pdf-parse` (CJS, loaded via `createRequire`)
- File upload: `multer` (memory storage)

### `artifacts/resume-matcher` (`@workspace/resume-matcher`)

React + Vite frontend with Tailwind CSS and shadcn/ui components.

- Entry: `src/main.tsx`
- Router: wouter with BASE_URL prefix support
- Auth: `@workspace/replit-auth-web` (useAuth hook)
- API: `@workspace/api-client-react` (generated React Query hooks)
- Custom hooks: `src/hooks/use-upload.ts` (multipart form upload)

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/auth.ts` — users + sessions tables (Replit Auth)
- `src/schema/analyses.ts` — analyses table

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) and Orval config.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/replit-auth-web` (`@workspace/replit-auth-web`)

Browser auth package for Replit Auth. Provides `useAuth()` hook.

### `lib/integrations-openai-ai-server` (`@workspace/integrations-openai-ai-server`)

Server-side OpenAI integration using Replit AI Integrations proxy.
