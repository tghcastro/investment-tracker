#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm use 22
fi

node "$ROOT/scripts/check-node-version.mjs"

# Preserve nvm Node 22 when binding to port 80
exec sudo -E env "PATH=$PATH" npm run dev -w @investment-tracker/web
