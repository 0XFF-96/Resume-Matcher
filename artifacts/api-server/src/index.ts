import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import app from "./app";
import { logger } from "./lib/logger";

function loadDotEnvIfPresent(envPath: string): void {
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Support both `KEY=value` and `export KEY=value`
    const noExport = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;

    const eqIdx = noExport.indexOf("=");
    if (eqIdx === -1) continue;

    const key = noExport.slice(0, eqIdx).trim();
    if (!key) continue;

    let value = noExport.slice(eqIdx + 1).trim();

    // Strip surrounding quotes: "..." or '...'
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
      // Basic escape handling for common cases
      value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    }

    // Don't override explicitly-provided env vars
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Load `.env` from repository root (if present). This avoids having to `export ...` manually.
// artifacts/api-server/src/index.ts -> artifacts/api-server -> artifacts -> repo root
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
loadDotEnvIfPresent(path.join(repoRoot, ".env"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
