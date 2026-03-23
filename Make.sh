#!/bin/bash
set -euo pipefail

# Repository root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Load env vars for local deploy/dev.
# This ensures Drizzle has DATABASE_URL at runtime.
if [[ -f "$ROOT_DIR/.env" ]]; then
  # Export variables defined in .env to the environment.
  # set -a marks subsequently-defined variables for export.
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
else
  echo "==> Warning: .env not found at $ROOT_DIR/.env (DATABASE_URL may be missing)"
fi

# Vite build requires BASE_PATH (see artifacts/resume-matcher/vite.config.ts)
: "${BASE_PATH:=/}"
export BASE_PATH

echo "==> Install dependencies"
pnpm install --frozen-lockfile

echo "==> Push database schema (Drizzle)"
pnpm --filter @workspace/db push

echo "==> Build backend + frontend"
pnpm run build

echo "==> Done"
echo "Backend entry: artifacts/api-server/dist/index.mjs"
echo "Frontend static: artifacts/resume-matcher/dist/public"

