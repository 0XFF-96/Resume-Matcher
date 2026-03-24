SHELL := /bin/bash

# Default values (can be overridden: `make deploy BASE_PATH=/app`)
BASE_PATH ?= /

.PHONY: help install db-push build deploy typecheck

help:
	@echo "Usage:"
	@echo "  make install        Install dependencies"
	@echo "  make db-push        Push DB schema (Drizzle)"
	@echo "  make build          Build backend + frontend"
	@echo "  make deploy         Run deploy pipeline (install + db-push + build)"
	@echo ""
	@echo "Local debug:"
	@echo "  make dev-api        Start backend (api-server)"
	@echo "  make dev-web        Start frontend (resume-matcher)"
	@echo "  make dev            Alias for starting both in separate commands"
	@echo ""
	@echo "Overrides:"
	@echo "  BASE_PATH=/        Vite base path (required by frontend build)"

install:
	pnpm install --frozen-lockfile

db-push:
	pnpm --filter @workspace/db push

typecheck:
	pnpm run typecheck

build:
	# Root build runs typecheck first, then builds all workspaces that define `build`
	pnpm run build

deploy:
	# Keep single source of truth in ./Make.sh
	BASE_PATH="$(BASE_PATH)" bash ./Make.sh

# ---------------------------
# Local development/debug
# ---------------------------
# Expected env vars for backend:
# - DATABASE_URL
# - AI_INTEGRATIONS_OPENAI_BASE_URL
# - AI_INTEGRATIONS_OPENAI_API_KEY
#
# Cookie note: backend sets session cookie with `secure: true`,
# so HTTPS (or proper proxy) is recommended.

API_PORT ?= 3001
WEB_PORT ?= 5173

dev-api:
	@echo "==> Starting backend on PORT=$(API_PORT)"
	@bash -lc 'set -euo pipefail; \
		if [[ -f "./.env" ]]; then \
			set -a; \
			source "./.env"; \
			set +a; \
		fi; \
		export PORT="$(API_PORT)"; \
		: "${DATABASE_URL:?DATABASE_URL is required}"; \
		: "${AI_INTEGRATIONS_OPENAI_BASE_URL:?AI_INTEGRATIONS_OPENAI_BASE_URL is required}"; \
		: "${AI_INTEGRATIONS_OPENAI_API_KEY:?AI_INTEGRATIONS_OPENAI_API_KEY is required}"; \
		pnpm --filter @workspace/api-server dev'

dev-web:
	@echo "==> Starting frontend on PORT=$(WEB_PORT), BASE_PATH=$(BASE_PATH)"
	@bash -lc 'set -euo pipefail; \
		export PORT="$(WEB_PORT)"; \
		export BASE_PATH="$(BASE_PATH)"; \
		export API_PROXY_TARGET="http://127.0.0.1:$(API_PORT)"; \
		pnpm --filter @workspace/resume-matcher dev'

dev:
	@echo "Run these in two terminals:"
	@echo "  1) make dev-api"
	@echo "  2) make dev-web  (Vite proxies /api -> http://127.0.0.1:$(API_PORT))"
