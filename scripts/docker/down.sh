#!/usr/bin/env bash
# Stops and removes the Prelegal containers started by scripts/docker/up.sh.

set -euo pipefail

COMPOSE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compose.yml"

if [ "${1:-}" = "--rmi" ]; then
  docker compose -f "$COMPOSE_FILE" down --rmi local
else
  docker compose -f "$COMPOSE_FILE" down
fi
