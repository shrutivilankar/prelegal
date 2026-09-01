import os
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.db import init_db, sync_templates
from app.routers import chat, health, templates
from app.services.catalog import load_catalog

REPO_ROOT = Path(__file__).resolve().parents[2]

# Loaded at import so settings read while building the app see .env too.
# Real environment variables win.
load_dotenv(REPO_ROOT / ".env")

ALLOWED_ORIGINS_ENV_VAR = "PRELEGAL_ALLOWED_ORIGINS"
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def allowed_origins() -> list[str]:
    """Comma-separated override, needed when the frontend is not on port 3000."""
    configured = [
        origin.strip()
        for origin in os.environ.get(ALLOWED_ORIGINS_ENV_VAR, "").split(",")
        if origin.strip()
    ]
    return configured or DEFAULT_ALLOWED_ORIGINS


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_db()
    sync_templates(load_catalog())
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Prelegal API", version=__version__, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    app.include_router(health.router)
    app.include_router(templates.router)
    app.include_router(chat.router)
    return app


app = create_app()
