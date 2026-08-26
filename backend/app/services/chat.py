import datetime
import json
import os
from collections.abc import Callable

from litellm import completion
from pydantic import ValidationError

from app.schemas import ChatMessage, ChatResponse, NdaFieldsPatch

API_KEY_ENV_VAR = "OPENROUTER_API_KEY"
MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}
CHAT_TIMEOUT_SECONDS = 60
MAX_COMPLETION_TOKENS = 800
MAX_YEARS_DIGITS = 4

SYSTEM_PROMPT = """You are the intake assistant for Prelegal, a tool that drafts a \
Common Paper-style Mutual Non-Disclosure Agreement (MNDA) through conversation. \
The live document preview updates as fields are confirmed.

Rules:
- Ask exactly one question per turn. Keep replies to 2-3 sentences.
- Briefly acknowledge values the user just gave before moving on.
- Do not ask about a field that is already confirmed. Start with the two party \
company names, then the effective date.
- Never invent or guess values. Only include what the user explicitly stated.

Field catalog:
- party1Name, party2Name: legal company names (required).
- effectiveDate: convert any spoken date to ISO format YYYY-MM-DD (required).
- purpose: short free-text description of how Confidential Information may be used.
- mndaTerm: "fixed" (then also ask mndaTermYears, a positive integer) or \
"until-terminated". If the user is indifferent, default to fixed / 1 year.
- confidentialityTerm: "fixed" (then also ask confidentialityYears, a positive \
integer) or "perpetuity".
- governingLaw: state or jurisdiction name. jurisdiction: courts venue wording.
- modifications: optional free-text list of modifications to the standard terms.

Every turn, emit nda_fields as the cumulative set of ALL confirmed fields so far; \
omit anything not yet confirmed. Once party names and effective date are confirmed, \
wrap up by noting they can download the PDF from the preview."""


class ChatServiceError(Exception):
    """Base class for chat service failures."""


class MissingApiKeyError(ChatServiceError):
    """The LLM provider API key is not configured."""


class ProviderError(ChatServiceError):
    """The LLM provider failed or returned an unusable response."""


def call_model(system_prompt: str, turns: list[dict]) -> str:
    """Sole isolation seam for the LLM provider call."""
    api_key = os.environ.get(API_KEY_ENV_VAR)
    if not api_key:
        raise MissingApiKeyError(API_KEY_ENV_VAR)
    try:
        response = completion(
            model=MODEL,
            messages=[{"role": "system", "content": system_prompt}, *turns],
            api_key=api_key,
            response_format=ChatResponse,
            reasoning_effort="low",
            timeout=CHAT_TIMEOUT_SECONDS,
            max_tokens=MAX_COMPLETION_TOKENS,
            extra_body=EXTRA_BODY,
        )
        content = response.choices[0].message.content
    except Exception as exc:
        raise ProviderError(str(exc)) from exc
    if not isinstance(content, str):
        raise ProviderError("Provider returned an empty completion.")
    return content


def _normalize_iso_date(value: str) -> str | None:
    """Return the canonical YYYY-MM-DD form, tolerating a trailing time component."""
    date_part = value.strip().split("T")[0]
    try:
        year, month, day = (int(part) for part in date_part.split("-"))
        return datetime.date(year, month, day).isoformat()
    except ValueError:
        return None


def _normalize_years(value: str) -> str | None:
    text = value.strip()
    # isdecimal() plus isascii() keeps int() total: isdigit() admits characters
    # such as "²" that int() rejects, and the digit cap avoids CPython's
    # int-parsing limit.
    if not (text.isascii() and text.isdecimal() and len(text) <= MAX_YEARS_DIGITS):
        return None
    return text if int(text) >= 1 else None


_FIELD_NORMALIZERS: dict[str, Callable[[str], str | None]] = {
    "effectiveDate": _normalize_iso_date,
    "mndaTermYears": _normalize_years,
    "confidentialityYears": _normalize_years,
}


def normalize_fields(patch: NdaFieldsPatch) -> NdaFieldsPatch:
    """Drop empty/invalid values so only confirmed fields survive."""
    cleaned = {}
    for name in type(patch).model_fields:
        value = getattr(patch, name)
        if value is None:
            continue
        normalized = _FIELD_NORMALIZERS.get(name, str.strip)(value)
        if normalized:
            cleaned[name] = normalized
    return NdaFieldsPatch(**cleaned)


def parse_fields(raw_fields: object) -> NdaFieldsPatch:
    """Validate each field on its own so one bad value cannot discard the turn."""
    if not isinstance(raw_fields, dict):
        return NdaFieldsPatch()
    accepted = {}
    for name in NdaFieldsPatch.model_fields:
        if name not in raw_fields:
            continue
        try:
            single = NdaFieldsPatch(**{name: raw_fields[name]})
        except ValidationError:
            continue
        accepted[name] = getattr(single, name)
    return normalize_fields(NdaFieldsPatch(**accepted))


def build_chat_response(messages: list[ChatMessage]) -> ChatResponse:
    turns = [{"role": message.role, "content": message.content} for message in messages]
    raw = call_model(SYSTEM_PROMPT, turns)
    try:
        payload = json.loads(raw)
    except ValueError as exc:
        raise ProviderError("Provider returned invalid JSON.") from exc
    if not isinstance(payload, dict):
        raise ProviderError("Provider returned invalid JSON.")
    reply = payload.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        raise ProviderError("Provider returned an empty reply.")
    return ChatResponse(
        reply=reply.strip(),
        nda_fields=parse_fields(payload.get("nda_fields")),
    )
