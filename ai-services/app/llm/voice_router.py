"""
Voice Interaction Router
Exposes endpoints for voice-based mentor interactions
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import StreamingResponse
import logging
import json
from typing import Dict, Any, List
from .voice_interaction_service import VoiceInteractionService, get_voice_service

router = APIRouter(prefix="/ai/lab", tags=["voice"])

logger = logging.getLogger(__name__)

@router.post("/voice-interact")
async def voice_interact(
    payload: Dict[str, Any] = Body(...),
    voice_service: VoiceInteractionService = Depends(get_voice_service)
):
    """
    Two-way voice interaction endpoint.
    1. Classifies intent
    2. Generates contextual response
    3. Streams response via SSE
    """
    transcript = payload.get("transcript")
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    # Sanitize
    transcript = voice_service.sanitize_transcript(transcript)
    if "[REDACTED]" in transcript:
        return StreamingResponse(
            (f'data: {json.dumps({"content": "I cannot answer that for security reasons.", "done": True})}\n\n' for _ in range(1)),
            media_type="text/event-stream"
        )

    problem_context = payload.get("problemContext", {})
    user_code = payload.get("userCode", "")
    chat_history = payload.get("history", [])

    # 1. Classify Intent
    intent_info = await voice_service.classify_intent(transcript)
    
    # 2. Generate and Stream Response
    async def stream_response():
        full_response = ""
        # Send intent info first
        yield f'data: {json.dumps({"type": "intent", "data": intent_info})}\n\n'
        
        async for chunk in voice_service.generate_mentor_response(
            transcript=transcript,
            problem_context=problem_context,
            user_code=user_code,
            chat_history=chat_history,
            intent_info=intent_info
        ):
            content = chunk.get("content", "")
            full_response += content
            yield f'data: {json.dumps(chunk)}\n\n'
        
        # Final metadata
        yield f'data: {json.dumps({"type": "done", "full_response": full_response})}\n\n'

    return StreamingResponse(stream_response(), media_type="text/event-stream")
