#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found. Please install Node.js (includes npm/npx)." >&2
  exit 1
fi

echo "Cleaning dist/ ..."
npx rimraf dist

echo "Building with Rollup ..."
npx rollup -c

echo "Done. Load the extension from: $ROOT_DIR/dist"

