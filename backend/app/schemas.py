from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["ok", "error"]
    version: str


class TemplateSummary(BaseModel):
    name: str
    description: str
    filename: str


class TemplateListResponse(BaseModel):
    templates: list[TemplateSummary]


class TemplateDetail(TemplateSummary):
    content: str
