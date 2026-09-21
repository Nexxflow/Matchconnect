#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
trap 'kill 0' EXIT

(cd "$ROOT/backend" && npm run dev) &
(cd "$ROOT/frontend" && npm run dev) &

if [ "$1" = "all" ]; then
  (cd "$ROOT/admin-frontend" && npm run dev -- --port 5174) &
  (cd "$ROOT/promotion-frontend" && npm run dev -- --port 5175) &
fi

wait
