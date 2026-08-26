import logging

from fastapi import APIRouter, HTTPException

from app.schemas import ChatRequest, ChatResponse
from app.services import chat

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


@router.post("/api/chat", response_model=ChatResponse, response_model_exclude_none=True)
def create_chat_reply(request: ChatRequest) -> ChatResponse:
    try:
        return chat.build_chat_response(request.messages)
    except chat.MissingApiKeyError as exc:
        logger.warning("Chat rejected: %s is not set.", chat.API_KEY_ENV_VAR)
        raise HTTPException(
            status_code=503,
            detail="Chat is unavailable: the server API key is not configured.",
        ) from exc
    except chat.ProviderError as exc:
        logger.warning("Chat provider failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="The AI service failed to respond. Please try again.",
        ) from exc
