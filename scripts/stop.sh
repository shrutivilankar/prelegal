#!/usr/bin/env bash
# Stops the backend and frontend started by scripts/start.sh,
# removing their PID files from .run/.

set -u

case "$(uname -s 2>/dev/null || true)" in
  MINGW* | MSYS* | CYGWIN*)
    echo "On Windows run instead: powershell -File scripts\\stop.ps1" >&2
    exit 1
    ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT/.run"

for service in backend frontend; do
  pidfile="$RUN_DIR/$service.pid"
  [ -f "$pidfile" ] || continue

  pid="$(cat "$pidfile" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    # Stop children first, then the process; escalate only if needed.
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.5
    done
    if kill -0 "$pid" 2>/dev/null; then
      pkill -KILL -P "$pid" 2>/dev/null || true
      kill -KILL "$pid" 2>/dev/null || true
    fi
    echo "Stopped $service (PID $pid)."
  else
    echo "$service is not running (stale PID file)."
  fi
  rm -f "$pidfile"
done
