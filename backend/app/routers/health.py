from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app import __version__, db
from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthResponse)
def health() -> JSONResponse:
    database_ok = db.check()
    body = HealthResponse(
        status="ok" if database_ok else "degraded",
        database="ok" if database_ok else "error",
        version=__version__,
    )
    return JSONResponse(
        status_code=200 if database_ok else 503,
        content=body.model_dump(),
    )
