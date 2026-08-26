from typing import Literal

from pydantic import BaseModel, Field, field_validator


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


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)


class NdaFieldsPatch(BaseModel):
    party1Name: str | None = None
    party2Name: str | None = None
    purpose: str | None = None
    effectiveDate: str | None = None
    mndaTerm: Literal["fixed", "until-terminated"] | None = None
    mndaTermYears: str | None = None
    confidentialityTerm: Literal["fixed", "perpetuity"] | None = None
    confidentialityYears: str | None = None
    governingLaw: str | None = None
    jurisdiction: str | None = None
    modifications: str | None = None

    @field_validator("mndaTermYears", "confidentialityYears", mode="before")
    @classmethod
    def _stringify_years(cls, value: object) -> object:
        if isinstance(value, int) and not isinstance(value, bool):
            return str(value)
        return value


class ChatResponse(BaseModel):
    reply: str
    nda_fields: NdaFieldsPatch = Field(default_factory=NdaFieldsPatch)
