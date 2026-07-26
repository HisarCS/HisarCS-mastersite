#!/usr/bin/env bash
# Tail the local Supabase Edge Runtime logs — where edge functions'
# console.log/error output goes (verify-org-member etc.). This is the reliable
# way to see function errors instead of relying on the browser's error text.
#
# Usage:
#   npm run logs:edge          # follow, last 100 lines
#   npm run logs:edge -- 500   # follow, last 500 lines
set -euo pipefail

lines="${1:-100}"
container="$(docker ps --format '{{.Names}}' | grep -iE 'edge_runtime' | head -1 || true)"

if [ -z "${container}" ]; then
  echo "No Supabase edge-runtime container is running." >&2
  echo "Start the local stack first:  npm run stack" >&2
  exit 1
fi

echo "Tailing ${container} (Ctrl+C to stop)…"
exec docker logs -f --tail "${lines}" "${container}"
