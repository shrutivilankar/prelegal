# prelegal
A platform for drafting common legal agreements

**Status**: In progress

## Repository layout

- `frontend/` — Next.js app (Mutual NDA creator prototype)
- `backend/` — FastAPI service with SQLite as its temporary database
- `templates/`, `catalog.json` — Common Paper template dataset served by the backend API
- `scripts/` — start/stop helpers that launch both services

## Prerequisites

- Python 3.10+
- Node.js 18+ with npm

## Quickstart

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start.ps1
```

macOS / Linux:

```bash
./scripts/start.sh
```

The first run creates `.venv`, installs backend and frontend dependencies, then
starts both services detached:

- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:8000 (interactive API docs at `/docs`)
- Logs and PID files: `.run/`

Stop everything:

```powershell
powershell -File scripts\stop.ps1    # Windows
./scripts/stop.sh                    # macOS / Linux
```

The SQLite database lives at `backend/data/prelegal.db` (override with the
`PRELEGAL_DB_PATH` environment variable). It is seeded from `catalog.json` on
startup.

Default ports are backend `8000` and frontend `3000`. If they collide with
something on your machine, pass alternatives:

```powershell
scripts\start.ps1 -BackendPort 8001 -FrontendPort 3100   # Windows
BACKEND_PORT=8001 FRONTEND_PORT=3100 ./scripts/start.sh  # macOS / Linux
```

## Docker

Everything Docker-related lives in `scripts/docker/`. Build the images and start
both services:

```powershell
scripts\docker\up.ps1                      # Windows
./scripts/docker/up.sh                     # macOS / Linux
```

The script waits until both containers report healthy, then prints the URLs.
Ports match the local workflow (frontend `3000`, backend `8000`) and are
overridable:

```powershell
scripts\docker\up.ps1 -BackendPort 8001 -FrontendPort 3100     # Windows
BACKEND_PORT=8001 FRONTEND_PORT=3100 ./scripts/docker/up.sh    # macOS / Linux
```

Stop and remove the containers (add `-RemoveImages` / `--rmi` to drop the images
too):

```powershell
scripts\docker\down.ps1     # Windows
./scripts/docker/down.sh    # macOS / Linux
```

Notes:

- The repository root `.env` is passed to the backend container if present, so
  `/api/chat` works in Docker exactly as it does locally.
- `NEXT_PUBLIC_API_BASE_URL` is baked into the frontend image at build time
  because the browser, not the container, calls the backend. The scripts derive
  it from the published backend port, so changing ports requires a rebuild —
  which `up` does every run.
- Compose points the backend's `PRELEGAL_ALLOWED_ORIGINS` at the published
  frontend port so CORS follows the port override.
- SQLite is rebuilt from `catalog.json` on every container start, so no volume
  is mounted.

## Backend API

| Method | Path                        | Description                                  |
| ------ | --------------------------- | -------------------------------------------- |
| GET    | `/api/health`               | Liveness check including database status     |
| GET    | `/api/templates`            | List all templates from the catalog          |
| GET    | `/api/templates/{filename}` | Template metadata plus full markdown content |
| POST   | `/api/chat`                 | Conversational NDA intake; extracts fields   |

Unknown filenames return `404`. Only filenames present in `catalog.json`
resolve; everything else is rejected.

The frontend fetches template content from this API at runtime. Point it at a
different backend with the `NEXT_PUBLIC_API_BASE_URL` environment variable
(default: `http://localhost:8000`).

Browser requests are restricted to `http://localhost:3000` and
`http://127.0.0.1:3000`. Serving the frontend elsewhere requires listing those
origins in `PRELEGAL_ALLOWED_ORIGINS` (comma-separated).

## AI chat configuration

The Mutual NDA creator uses a freeform AI chat instead of a form. The backend
routes chat through LiteLLM → OpenRouter → Cerebras. To enable it, create a
`.env` file at the repository root containing:

```
OPENROUTER_API_KEY=<your key>
```

The backend loads `.env` automatically on startup (real environment variables
take precedence). Without the key, `/api/chat` returns `503`; everything else
keeps working.

## Tests

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
python -m pytest
```

Frontend:

```bash
cd frontend
npm install
npm test
npm run typecheck
```
