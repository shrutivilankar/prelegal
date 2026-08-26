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

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    load_dotenv(REPO_ROOT / ".env")
    init_db()
    sync_templates(load_catalog())
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Prelegal API", version=__version__, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    app.include_router(health.router)
    app.include_router(templates.router)
    app.include_router(chat.router)
    return app


app = create_app()
