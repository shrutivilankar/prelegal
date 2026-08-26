from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.db import init_db, sync_templates
from app.routers import health, templates
from app.services.catalog import load_catalog

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_db()
    sync_templates(load_catalog())
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Prelegal API", version=__version__, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_methods=["GET"],
        allow_headers=[],
    )
    app.include_router(health.router)
    app.include_router(templates.router)
    return app


app = create_app()
