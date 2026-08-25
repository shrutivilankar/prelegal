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

## Backend API

| Method | Path                        | Description                                  |
| ------ | --------------------------- | -------------------------------------------- |
| GET    | `/api/health`               | Liveness check including database status     |
| GET    | `/api/templates`            | List all templates from the catalog          |
| GET    | `/api/templates/{filename}` | Template metadata plus full markdown content |

Unknown filenames return `404`. Only filenames present in `catalog.json`
resolve; everything else is rejected.

The frontend fetches template content from this API at runtime. Point it at a
different backend with the `NEXT_PUBLIC_API_BASE_URL` environment variable
(default: `http://localhost:8000`).

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
