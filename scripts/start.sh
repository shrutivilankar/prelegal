#!/usr/bin/env bash
# Starts the FastAPI backend and Next.js frontend.
# Logs and PID files are written to .run/ at the repository root.
# Stop everything with scripts/stop.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT/.run"
mkdir -p "$RUN_DIR"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# --- Locate Python ---
PYTHON_BIN="${PYTHON:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Python 3.10+ is required (tried: $PYTHON_BIN)." >&2
  exit 1
fi
PY_VERSION="$("$PYTHON_BIN" --version)"
if ! echo "$PY_VERSION" | grep -Eq "Python 3\.(1[0-9]|[2-9][0-9])"; then
  echo "Python 3.10 or newer is required, found: $PY_VERSION" >&2
  exit 1
fi

# --- Ensure virtual environment and dependencies ---
if [ ! -d "$ROOT/.venv" ]; then
  echo "Creating Python virtual environment..."
  "$PYTHON_BIN" -m venv "$ROOT/.venv"
fi
VPY="$ROOT/.venv/bin/python"
MARKER="$ROOT/.venv/.deps-installed"
if [ ! -f "$MARKER" ] || [ "$ROOT/backend/requirements.txt" -nt "$MARKER" ]; then
  echo "Installing backend dependencies..."
  "$VPY" -m pip install -q -r "$ROOT/backend/requirements.txt"
  touch "$MARKER"
fi

# --- Ensure frontend dependencies ---
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$ROOT/frontend" && npm install)
fi

# --- Port hygiene ---
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -ti tcp:"$port" >/dev/null 2>&1; then
    echo "Port $port is already in use (PID $(lsof -ti tcp:"$port" | tr '\n' ' ')). Run scripts/stop.sh first." >&2
    exit 1
  fi
done

# --- Start backend ---
echo "Starting backend on http://127.0.0.1:$BACKEND_PORT ..."
(cd "$ROOT/backend" && nohup "$VPY" -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" \
  >"$RUN_DIR/backend.log" 2>&1 & echo $! >"$RUN_DIR/backend.pid")

BACKEND_PID="$(cat "$RUN_DIR/backend.pid")"
BACKEND_READY=0
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$BACKEND_PORT/api/health" 2>/dev/null | grep -q '"ok"'; then
    BACKEND_READY=1
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    break
  fi
  sleep 0.5
done
if [ "$BACKEND_READY" -ne 1 ]; then
  echo "Backend did not become healthy. Last log lines:" >&2
  tail -n 20 "$RUN_DIR/backend.log" >&2 || true
  "$ROOT/scripts/stop.sh" || true
  exit 1
fi
echo "Backend healthy (PID $BACKEND_PID)."

# --- Start frontend ---
echo "Starting frontend on http://localhost:$FRONTEND_PORT ..."
(cd "$ROOT/frontend" && nohup npm run dev -- -p "$FRONTEND_PORT" >"$RUN_DIR/frontend.log" 2>&1 & echo $! >"$RUN_DIR/frontend.pid")
FRONTEND_PID="$(cat "$RUN_DIR/frontend.pid")"

FRONTEND_READY=0
for _ in $(seq 1 120); do
  if curl -fsS -o /dev/null "http://localhost:$FRONTEND_PORT" 2>/dev/null; then
    FRONTEND_READY=1
    break
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    break
  fi
  sleep 0.75
done
if [ "$FRONTEND_READY" -eq 1 ]; then
  echo "Frontend ready (PID $FRONTEND_PID)."
else
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "Warning: frontend process exited early. Last log lines:" >&2
    tail -n 20 "$RUN_DIR/frontend.log" >&2 || true
  else
    echo "Warning: frontend did not respond within the timeout; it may still be compiling." >&2
    echo "Check .run/frontend.log for progress." >&2
  fi
fi

echo ""
echo "Prelegal is running:"
echo "  Frontend:  http://localhost:$FRONTEND_PORT"
echo "  Backend:   http://127.0.0.1:$BACKEND_PORT  (API docs: http://127.0.0.1:$BACKEND_PORT/docs)"
echo "  Logs/PIDs: $RUN_DIR"
echo "Stop with: scripts/stop.sh"
