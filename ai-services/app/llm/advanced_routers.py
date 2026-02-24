"""
Phase 2: Advanced AI Endpoints
- Hint generation with streaming
- Code review with structured scoring
- Explanation evaluation
- Inline assistance
- Health and metrics
"""

import asyncio
import json
import logging
import os
from typing import AsyncGenerator

from fastapi import APIRouter, Body, HTTPException, status
from fastapi.responses import StreamingResponse

from .question_generation_service import QuestionGenerationService
from ..schemas.schemas import (
    HintGenerationRequest,
    HintResponse,
    CodeReviewRequest,
    CodeReviewResponse,
    CodeQualityScores,
    ExplanationScoringRequest,
    ExplanationScoreResponse,
    InlineAssistRequest,
    InlineSuggestion,
    HealthResponse,
    ProviderStatus,
    MetricsResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["ai-advanced"])


# ============================================================================
# HINT GENERATION WITH SSE STREAMING
# ============================================================================

@router.post("/hint/generate", response_class=StreamingResponse)
async def generate_hint_streaming(request: HintGenerationRequest = Body(...)):
    """
    Generate adaptive hints with streaming response
    
    Supports hint levels 1-4:
    - Level 1: General approach direction
    - Level 2: Key data structures
    - Level 3: Algorithm outline
    - Level 4: Nearly complete solution
    
    Uses Server-Sent Events for streaming tokens
    """
    try:
        logger.info(f"🔍 Generating hint level {request.hintLevel} for {request.topicId}")
        
        # Build prompt for hint generation
        hint_prompt = f"""
Generate a coding hint at LEVEL {request.hintLevel} (scale 1-4, where 4 is almost the solution).

Problem: {request.problemStatement}

Current Code:
{request.currentCode or 'No code yet'}

Requirements:
1. Hint must be at exactly level {request.hintLevel}
2. Return ONLY valid JSON matching this structure:
{{
  "level": {request.hintLevel},
  "hintText": "...",
  "dependencyWeight": 0.X,
  "approachDirection": "...",
  "keyInsight": "..."
}}

No markdown, no explanation, just JSON.
"""
        
        async def stream_hint():
            """Stream hint generation tokens"""
            try:
                # Initialize Groq client
                groq_key = os.getenv('GROQ_API_KEY')
                import groq as groq_lib
                groq_client = groq_lib.Groq(api_key=groq_key)
                
                # Stream the response
                with groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": hint_prompt}],
                    stream=True,
                    temperature=0.7,
                    max_tokens=1024,
                ) as response:
                    collected_tokens = ""
                    
                    for chunk in response:
                        if chunk.choices[0].delta.content:
                            token = chunk.choices[0].delta.content
                            collected_tokens += token
                            
                            # Stream token
                            yield f"data: {json.dumps({'token': token, 'type': 'text'})}\n\n"
                            await asyncio.sleep(0.01)  # Small delay for client buffering
                    
                    # Parse and validate final JSON
                    try:
                        hint_data = json.loads(collected_tokens)
                        hint_response = HintResponse(**hint_data)
                        yield f"data: {json.dumps(hint_response.model_dump())}\n\n"
                    except (json.JSONDecodeError, ValueError) as e:
                        logger.error(f"Invalid hint JSON: {e}")
                        yield f"data: {json.dumps({'error': 'Invalid response format'})}\n\n"
                    
                    # Signal stream end
                    yield "data: [DONE]\n\n"
                    
            except Exception as e:
                logger.error(f"Stream error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            stream_hint(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
        
    except Exception as e:
        logger.error(f"Hint generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hint generation failed: {str(e)}"
        )


# ============================================================================
# CODE REVIEW WITH STRUCTURED SCORING
# ============================================================================

@router.post("/practice/review", response_model=CodeReviewResponse)
async def review_code(request: CodeReviewRequest = Body(...)):
    """
    Analyze code and provide structured review
    
    Returns:
    - Code quality scores (0-1 scale)
    - Interview insights
    - Specific improvements
    - Identified strengths
    """
    try:
        logger.info(f"📝 Code review requested for session {request.sessionId}")
        
        review_prompt = f"""
Analyze this code submission and provide a structured review.

Problem: {request.problemStatement}

Code ({request.language}):
{request.code}

Test Results: {request.testCasesPassed or 0}/{request.totalTestCases or '?'} passed

Provide ONLY valid JSON response:
{{
  "reviewSummary": "...",
  "codeQualityScores": {{
    "readability": 0.X,
    "structure": 0.X,
    "naming": 0.X,
    "errorHandling": 0.X,
    "optimization": 0.X
  }},
  "interviewInsights": "...",
  "improvements": ["..."],
  "strengths": ["..."]
}}

Scores from 0 (poor) to 1 (excellent). No markdown, just JSON.
"""
        
        groq_key = os.getenv('GROQ_API_KEY')
        import groq as groq_lib
        groq_client = groq_lib.Groq(api_key=groq_key)
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": review_prompt}],
            temperature=0.7,
            max_tokens=2048,
        )
        
        review_text = response.choices[0].message.content.strip()
        
        # Parse and validate
        try:
            review_data = json.loads(review_text)
            review_response = CodeReviewResponse(**review_data)
            logger.info(f"✅ Code review completed: {review_response.codeQualityScores.readability:.2f} avg quality")
            return review_response
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Invalid review JSON: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid review response format"
            )
            
    except Exception as e:
        logger.error(f"Code review error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code review failed: {str(e)}"
        )


# ============================================================================
# EXPLANATION SCORING
# ============================================================================

@router.post("/explanation/score", response_model=ExplanationScoreResponse)
async def score_explanation(request: ExplanationScoringRequest = Body(...)):
    """
    Score user's explanation of their solution
    
    Evaluates:
    - Clarity of communication
    - Technical correctness
    - Logical structure
    - Interview readiness
    """
    try:
        logger.info(f"🎯 Scoring explanation for session {request.sessionId}")
        
        score_prompt = f"""
Score this explanation of a coding solution.

Problem Code:
{request.code}

User's Explanation:
{request.explanation}

Solution Correct: {request.correctSolution}
Context: {request.interviewContext or 'General'}

Provide ONLY valid JSON:
{{
  "clarity": 0.X,
  "correctness": 0.X,
  "structure": 0.X,
  "interview_readiness": 0.X,
  "explanation_quality_score": 0.X,
  "feedback": "...",
  "suggestions": ["..."]
}}

Scores 0-1. No markdown, just JSON.
"""
        
        groq_key = os.getenv('GROQ_API_KEY')
        import groq as groq_lib
        groq_client = groq_lib.Groq(api_key=groq_key)
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": score_prompt}],
            temperature=0.7,
            max_tokens=1024,
        )
        
        score_text = response.choices[0].message.content.strip()
        
        try:
            score_data = json.loads(score_text)
            score_response = ExplanationScoreResponse(**score_data)
            logger.info(f"✅ Explanation scored: {score_response.explanation_quality_score:.2f}")
            return score_response
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Invalid explanation score JSON: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid score response format"
            )
            
    except Exception as e:
        logger.error(f"Explanation scoring error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Explanation scoring failed: {str(e)}"
        )


# ============================================================================
# INLINE ASSISTANCE
# ============================================================================

@router.post("/assist/inline", response_model=InlineSuggestion)
async def inline_assist(request: InlineAssistRequest = Body(...)):
    """
    Real-time inline code suggestions
    
    Fast endpoint for:
    - Pattern suggestions
    - Idiom recommendations
    - Bug detection hints
    - Refactoring ideas
    
    Limited context (max 1500 chars) for low latency
    """
    try:
        logger.info(f"💡 Inline assist for {request.language}")
        
        assist_prompt = f"""
Provide ONE quick suggestion for this code snippet.

Language: {request.language}
Code:
{request.codeChunk}

Context: {request.context or 'None'}

Suggest ONE improvement (max 50 words). Return JSON:
{{
  "suggestionText": "...",
  "confidence": 0.X,
  "type": "hint|refactoring|idiom|bug_fix",
  "codeSnippet": "...",
  "explanation": "..."
}}

Fast response, max 50 words per field. No markdown.
"""
        
        groq_key = os.getenv('GROQ_API_KEY')
        import groq as groq_lib
        groq_client = groq_lib.Groq(api_key=groq_key)
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": assist_prompt}],
            temperature=0.5,
            max_tokens=512,
        )
        
        assist_text = response.choices[0].message.content.strip()
        
        try:
            assist_data = json.loads(assist_text)
            suggestion = InlineSuggestion(**assist_data)
            logger.info(f"✅ Inline suggestion: {suggestion.type} (confidence {suggestion.confidence:.2f})")
            return suggestion
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Invalid inline assist JSON: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid suggestion format"
            )
            
    except Exception as e:
        logger.error(f"Inline assist error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inline assist failed: {str(e)}"
        )


# ============================================================================
# HEALTH & METRICS
# ============================================================================

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check AI service health"""
    try:
        import datetime
        providers = {
            "groq": ProviderStatus(
                name="groq",
                available=bool(os.getenv('GROQ_API_KEY')),
                latency=None,
            ),
            "gemini": ProviderStatus(
                name="gemini",
                available=False,  # Fallback disabled
                latency=None,
            ),
        }
        
        return HealthResponse(
            status="healthy",
            providers=providers,
            timestamp=str(datetime.datetime.utcnow()),
        )
    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable"
        )


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """Get system metrics"""
    try:
        # Return mock metrics for now
        return MetricsResponse(
            llmCalls=0,
            totalTokens=0,
            totalCost=0.0,
            avgLatency=0.0,
            successRate=1.0,
            failedCalls=0,
            providersUsed=["groq"],
        )
    except Exception as e:
        logger.error(f"Metrics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch metrics"
        )

@router.post("/mentor/chat")
async def mentor_chat(request: dict = Body(...)):
    """
    Interactive mentor chat for practice sessions
    
    Request body:
    {
      "sessionId": "session-123",
      "transcript": "User's voice/text input",
      "intent": "help|hint|clarification|submit|stuck",
      "currentCode": "def solution(): pass",
      "problemStatement": "Problem description",
      "language": "python"
    }
    
    Response:
    {
      "success": true,
      "data": {
        "intent": "help",
        "response": "Mentor response text",
        "actionSuggested": "continue|hint|review|submit",
        "voiceReady": true
      }
    }
    """
    try:
        from .llm_provider_router import LLMProviderRouter
        
        sessionId = request.get('sessionId')
        transcript = request.get('transcript', '')
        intent = request.get('intent', 'help')
        currentCode = request.get('currentCode', '')
        problemStatement = request.get('problemStatement', '')
        language = request.get('language', 'python')
        
        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transcript is required"
            )
        
        # Initialize LLM router
        router = LLMProviderRouter()
        
        # Build mentor prompt
        mentor_prompt = f"""You are an expert programming mentor helping a learner during a practice session.

Problem: {problemStatement}
User's current attempt ({language}):
```{language}
{currentCode}
```

User said: "{transcript}"
User's intent: {intent}

Provide a brief, encouraging response that helps them progress. Keep it to 2-3 sentences max.
"""
        
        # Call LLM
        response_text = await router.call_llm_stream(
            model='groq',
            prompt=mentor_prompt,
            max_tokens=200,
        )
        
        # Determine action suggestion based on intent
        action_suggested = 'continue'
        if intent == 'hint':
            action_suggested = 'hint'
        elif intent == 'submit':
            action_suggested = 'submit'
        elif intent == 'stuck':
            action_suggested = 'review'
        
        return {
            'success': True,
            'data': {
                'intent': intent,
                'response': response_text,
                'actionSuggested': action_suggested,
                'voiceReady': True,
            }
        }
        
    except Exception as e:
        logger.error(f"Mentor chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mentor chat failed: {str(e)}"
        )