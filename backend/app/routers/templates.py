from fastapi import APIRouter, HTTPException

from app import db
from app.schemas import TemplateDetail, TemplateListResponse
from app.services import catalog

router = APIRouter(tags=["templates"])


@router.get("/api/templates", response_model=TemplateListResponse)
def list_templates() -> TemplateListResponse:
    rows = db.fetch_templates()
    return TemplateListResponse(templates=rows)


@router.get("/api/templates/{filename}", response_model=TemplateDetail)
def get_template(filename: str) -> TemplateDetail:
    row = db.get_template_row(filename)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Template not found: {filename}")
    try:
        content = catalog.read_template(filename)
    except (KeyError, OSError) as exc:
        raise HTTPException(
            status_code=404, detail=f"Template not found: {filename}"
        ) from exc
    return TemplateDetail(**row, content=content)
