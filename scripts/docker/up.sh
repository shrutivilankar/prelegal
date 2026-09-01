#!/usr/bin/env bash
# Builds the images and starts Prelegal in Docker.
# Stop everything with scripts/docker/down.sh.

set -euo pipefail

COMPOSE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compose.yml"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3001}"
export BACKEND_PORT FRONTEND_PORT

echo "Building images and starting containers..."
if ! docker compose -f "$COMPOSE_FILE" up -d --build --wait; then
  echo "Containers did not become healthy. Recent logs:" >&2
  docker compose -f "$COMPOSE_FILE" logs --tail 40 >&2
  exit 1
fi

echo ""
echo "Prelegal is running in Docker:"
echo "  Frontend:  http://localhost:$FRONTEND_PORT"
echo "  Backend:   http://localhost:$BACKEND_PORT  (API docs: http://localhost:$BACKEND_PORT/docs)"
echo "  Logs:      docker compose -f scripts/docker/compose.yml logs -f"
echo "Stop with: scripts/docker/down.sh"
