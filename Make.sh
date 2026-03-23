#!/bin/bash
set -euo pipefail

# Repository root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

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

