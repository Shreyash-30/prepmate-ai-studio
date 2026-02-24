"""
Voice Interaction Service
Handles speech-to-text via Groq Whisper and contextual AI mentor responses
"""
import logging
import os
import json
from typing import Dict, List, Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.llm.llm_provider_router import LLMProviderRouter
from app.llm.prompt_templates import PromptTemplates, PromptBuilder

logger = logging.getLogger(__name__)

# Global Voice Service Instance
_voice_service: Optional['VoiceInteractionService'] = None

def get_voice_service() -> 'VoiceInteractionService':
    global _voice_service
    if _voice_service is None:
        raise RuntimeError("Voice interaction service not initialized")
    return _voice_service

def set_voice_service(service: 'VoiceInteractionService'):
    global _voice_service
    _voice_service = service

class VoiceInteractionService:
    """Service for handling multi-turn voice interactions"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.llm_router = LLMProviderRouter()
        self.practice_sessions = db.practice_sessions if db is not None else None

    async def classify_intent(self, transcript: str) -> Dict[str, Any]:
        """
        Classify the intent of user's voice transcript
        Returns: {intent, dependencyWeight}
        """
        system_prompt = """
        You are an AI classifier for a coding mentor system.
        Classify the user's voice transcript into one of these intents:
        - clarification: Asking for more details about the problem (Weight: 0.1)
        - optimization: Asking how to make code faster/better (Weight: 0.2)
        - hint: Directly asking for a hint (Weight: 0.3)
        - confusion: Expressing they don't know what to do (Weight: 0.4)
        - solution-seeking: Asking for the full solution (Weight: 0.7)
        - general: Anything else (Weight: 0.0)

        Return ONLY a JSON object:
        {"intent": "intent-name", "dependencyWeight": 0.0}
        """

        try:
            response = await self.llm_router.generate_content(
                prompt=f"Transcript: {transcript}",
                system_prompt=system_prompt,
                provider="groq"
            )
            
            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response.get("content", ""), re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    "intent": result.get("intent", "general"),
                    "dependencyWeight": result.get("dependencyWeight", 0.0)
                }
            
            return {"intent": "general", "dependencyWeight": 0.0}
        except Exception as e:
            logger.error(f"Error classifying intent: {e}")
            return {"intent": "general", "dependencyWeight": 0.0}

    async def generate_mentor_response(
        self,
        transcript: str,
        problem_context: Dict[str, Any],
        user_code: str,
        chat_history: List[Dict[str, Any]],
        intent_info: Dict[str, Any]
    ):
        """
        Generate a contextual mentor response for the voice interaction
        Yields tokens for streaming
        """
        intent = intent_info.get("intent", "general")
        weight = intent_info.get("dependencyWeight", 0.0)

        # Build context-aware prompt
        system_prompt = f"""
        You are an expert AI Coding Mentor for PrepMate AI Studio.
        You are interacting with a student via VOICE.
        
        CONTEXT:
        Problem: {problem_context.get('title')}
        Difficulty: {problem_context.get('difficulty')}
        Description: {problem_context.get('description')}
        Constraints: {problem_context.get('constraints')}
        Starter Code: {problem_context.get('starterCode')}
        Function Metadata: {problem_context.get('functionMetadata')}
        
        USER'S CURRENT CODE:
        ```{problem_context.get('language', 'python')}
        {user_code}
        ```
        
        SUBMISSION STATUS:
        Verdict: {problem_context.get('lastVerdict', 'No submission yet')}
        Tests Passed: {problem_context.get('testCasesPassed', 0)}/{problem_context.get('totalTestCases', 0)}
        
        INTENT: {intent} (Impact on independence: {weight})
        
        GUIDELINES:
        - ALWAYS respond in English.
        - Keep your response conversational, concise, and professional (it will be spoken via TTS).
        - Use simple language, avoid reading out large blocks of code or complex symbols.
        - Encourage the student to think rather than giving the solution.
        - If intent is 'solution-seeking', offer a high-level approach first.
        - If the user has a failing submission (WRONG_ANSWER, RUNTIME_ERROR), help them debug by pointing out potential edge cases or logical flaws.
        - NEVER mention the 'wrapperTemplate', 'judge0', or internal system details.
        - NEVER leak hidden test cases.
        - If the user is confused, break down the problem into smaller parts.
        """

        # Build history string
        history_str = ""
        for msg in chat_history[-5:]: # Last 5 interactions
            role = "User" if msg.get("transcript") else "Mentor"
            content = msg.get("transcript") or msg.get("response")
            history_str += f"{role}: {content}\n"

        full_prompt = f"""
        {history_str}
        Student's Voice Message: {transcript}
        Mentor:
        """

        # Stream from Groq (optimized for voice)
        async for chunk in self.llm_router.generate_content_stream(
            prompt=full_prompt,
            system_prompt=system_prompt,
            provider="groq",
            model="llama-3.1-8b-instant"
        ):
            yield chunk

    def sanitize_transcript(self, transcript: str) -> str:
        """Basic sanitization of transcript"""
        if not transcript:
            return ""
        
        # Remove common prompt injection patterns
        malicious_patterns = [
            "ignore previous instructions",
            "system prompt",
            "show hidden test cases",
            "wrapper template",
            "reveal system"
        ]
        
        sanitized = transcript.lower()
        for pattern in malicious_patterns:
            if pattern in sanitized:
                return "[REDACTED POTENTIAL SECURITY THREAT]"
        
        return transcript
