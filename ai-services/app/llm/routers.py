"""
FastAPI Routers for LLM Services
Exposes endpoints for mentor, practice review, interview, and learning services
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from .gemini_client import get_gemini_client
from .mentor_service import (
    MentorService,
    MentorChatRequest,
    MentorChatResponse,
    get_mentor_service,
)
from .practice_review_service import (
    PracticeReviewService,
    CodeReviewRequest,
    CodeReviewResponse,
    get_practice_review_service,
)
from .interview_service import (
    InterviewService,
    InterviewSimulationRequest,
    InterviewSimulationResponse,
    get_interview_service,
)
from .learning_service import (
    LearningService,
    LearningContentRequest,
    LearningContent,
    get_learning_service,
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/ai", tags=["AI Services"])


# Dependency injectors
def get_mentor_svc() -> Optional[MentorService]:
    """Get mentor service"""
    svc = get_mentor_service()
    if not svc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Mentor service not initialized",
        )
    return svc


def get_review_svc() -> Optional[PracticeReviewService]:
    """Get practice review service"""
    svc = get_practice_review_service()
    if not svc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Practice review service not initialized",
        )
    return svc


def get_interview_svc() -> Optional[InterviewService]:
    """Get interview service"""
    svc = get_interview_service()
    if not svc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Interview service not initialized",
        )
    return svc


def get_learning_svc() -> Optional[LearningService]:
    """Get learning service"""
    svc = get_learning_service()
    if not svc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Learning service not initialized",
        )
    return svc


# Mentor routes
@router.post("/mentor/chat", response_model=MentorChatResponse)
async def mentor_chat(
    request: MentorChatRequest,
    service: MentorService = Depends(get_mentor_svc),
) -> MentorChatResponse:
    """
    Chat with AI mentor about a topic

    Request:
    - userId: User ID
    - topic: Topic to discuss
    - userMessage: User's question or message
    - preparationContext: Optional context about preparation
    - masteryScore: Optional current mastery level (0-1)
    - conversationId: Optional existing conversation ID

    Response:
    - conversationId: ID of the conversation
    - mentorResponse: Mentor's response
    - suggestedActions: List of suggested actions
    - topic: Topic discussed
    - timestamp: Response timestamp
    """
    try:
        response = await service.chat(request)
        return response
    except Exception as e:
        logger.error(f"Error in mentor chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing mentor chat",
        )


@router.get("/mentor/conversation/{conversation_id}")
async def get_mentor_conversation(
    conversation_id: str,
    service: MentorService = Depends(get_mentor_svc),
):
    """Retrieve a specific mentor conversation"""
    try:
        conversation = await service.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving conversation",
        )


@router.get("/mentor/conversations/{user_id}")
async def get_user_mentor_conversations(
    user_id: str,
    limit: int = 10,
    service: MentorService = Depends(get_mentor_svc),
):
    """Get user's mentor conversations"""
    try:
        conversations = await service.get_user_conversations(user_id, limit)
        return {"conversations": conversations, "count": len(conversations)}
    except Exception as e:
        logger.error(f"Error retrieving user conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving conversations",
        )


@router.delete("/mentor/conversation/{conversation_id}")
async def delete_mentor_conversation(
    conversation_id: str,
    service: MentorService = Depends(get_mentor_svc),
):
    """Delete a mentor conversation"""
    try:
        success = await service.delete_conversation(conversation_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
        return {"success": True, "message": "Conversation deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting conversation",
        )


# Practice review routes
@router.post("/practice/review", response_model=CodeReviewResponse)
async def review_code(
    request: CodeReviewRequest,
    service: PracticeReviewService = Depends(get_review_svc),
) -> CodeReviewResponse:
    """
    Review submitted code and provide feedback

    Request:
    - userId: User ID
    - problemDescription: Description of the problem
    - userCode: The code to review
    - language: Programming language
    - difficulty: Problem difficulty
    - topic: Topic area
    - problemId: Optional problem ID

    Response:
    - reviewSummary: Executive summary of the review
    - optimizationSuggestions: List of optimization suggestions
    - conceptualFeedback: Conceptual understanding feedback
    - codeQuality: Code quality scores
    - interviewInsights: Interview-specific insights
    - timestamp: Response timestamp
    """
    try:
        response = await service.review_code(request)
        return response
    except Exception as e:
        logger.error(f"Error reviewing code: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error reviewing code",
        )


@router.get("/practice/reviews/{user_id}")
async def get_user_code_reviews(
    user_id: str,
    limit: int = 10,
    service: PracticeReviewService = Depends(get_review_svc),
):
    """Get user's code reviews"""
    try:
        reviews = await service.get_user_reviews(user_id, limit)
        return {"reviews": reviews, "count": len(reviews)}
    except Exception as e:
        logger.error(f"Error retrieving reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving reviews",
        )


@router.post("/practice/compare")
async def compare_solutions(
    request: dict,
    service: PracticeReviewService = Depends(get_review_svc),
):
    """
    Compare two code solutions

    Request:
    - problemDescription: Description of the problem
    - originalCode: Original code solution
    - optimizedCode: Optimized code solution
    - language: Programming language
    """
    try:
        comparison = await service.compare_solutions(
            problem_description=request.get("problemDescription", ""),
            original_code=request.get("originalCode", ""),
            optimized_code=request.get("optimizedCode", ""),
            language=request.get("language", "python"),
        )
        return comparison
    except Exception as e:
        logger.error(f"Error comparing solutions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error comparing solutions",
        )


@router.post("/practice/optimizations")
async def get_optimizations(
    request: dict,
    service: PracticeReviewService = Depends(get_review_svc),
):
    """Get optimization suggestions for code"""
    try:
        optimizations = await service.suggest_optimizations(
            language=request.get("language", "python"),
            code=request.get("code", ""),
            problem_type=request.get("problemType", ""),
        )
        return {"optimizations": optimizations}
    except Exception as e:
        logger.error(f"Error getting optimizations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting optimizations",
        )


# Interview simulation routes
@router.post("/interview/simulate", response_model=InterviewSimulationResponse)
async def simulate_interview(
    request: InterviewSimulationRequest,
    service: InterviewService = Depends(get_interview_svc),
) -> InterviewSimulationResponse:
    """
    Simulate a technical interview

    Request:
    - userId: User ID
    - problemContext: The coding problem context
    - candidateExplanation: Candidate's explanation of their solution
    - topic: Topic area
    - difficulty: Problem difficulty
    - interviewSessionId: Optional session ID for continuation

    Response:
    - interviewSessionId: ID of the interview session
    - followUpQuestions: Follow-up questions from interviewer
    - reasoningFeedback: Feedback on reasoning
    - communicationScoreEstimate: Estimated communication score (1-10)
    - technicalFeedback: Technical feedback
    - strengths: Interview strengths identified
    - areasForImprovement: Areas for improvement
    - suggestions: Actionable suggestions
    - timestamp: Response timestamp
    """
    try:
        response = await service.simulate_interview(request)
        return response
    except Exception as e:
        logger.error(f"Error simulating interview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error simulating interview",
        )


@router.get("/interview/session/{session_id}")
async def get_interview_session(
    session_id: str,
    service: InterviewService = Depends(get_interview_svc),
):
    """Retrieve an interview session"""
    try:
        session = await service.get_interview_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview session not found",
            )
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving session",
        )


@router.get("/interview/history/{user_id}")
async def get_interview_history(
    user_id: str,
    limit: int = 10,
    service: InterviewService = Depends(get_interview_svc),
):
    """Get user's interview simulation history"""
    try:
        sessions = await service.get_user_interview_history(user_id, limit)
        return {"sessions": sessions, "count": len(sessions)}
    except Exception as e:
        logger.error(f"Error retrieving interview history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving history",
        )


@router.get("/interview/progress/{user_id}")
async def get_interview_progress(
    user_id: str,
    service: InterviewService = Depends(get_interview_svc),
):
    """Get interview progress and trends"""
    try:
        progress = await service.compare_interview_progress(user_id)
        if not progress:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No interview sessions found",
            )
        return progress
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting progress: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting progress",
        )


# Learning content routes
@router.post("/learning/generate", response_model=LearningContent)
async def generate_learning_content(
    request: LearningContentRequest,
    service: LearningService = Depends(get_learning_svc),
) -> LearningContent:
    """
    Generate comprehensive learning content for a topic

    Request:
    - topic: Topic to learn about
    - subject: Subject area
    - difficultyLevel: Learning difficulty level
    - userKnowledgeLevel: User's current knowledge level (1-5)
    - contentType: Type of content (comprehensive, summary, flashcards)
    - focusAreas: Optional areas to focus on

    Response:
    - topic: Topic covered
    - summary: Content summary
    - keyConcepts: Key concepts covered
    - examples: Practical examples
    - flashcards: Study flashcards
    - practiceQuestions: Practice questions
    - commonMistakes: Common mistakes to avoid
    - nextTopics: Suggested next topics
    - visualExplanations: Diagrams or pseudocode
    - realWorldApplications: Real-world uses
    - estimatedLearningTime: Estimated time in minutes
    - timestamp: Response timestamp
    """
    try:
        content = await service.generate_learning_content(request)
        return content
    except Exception as e:
        logger.error(f"Error generating learning content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating learning content",
        )


@router.get("/learning/summary/{topic}")
async def get_quick_summary(
    topic: str,
    max_length: int = 500,
    service: LearningService = Depends(get_learning_svc),
):
    """Get quick summary of a topic"""
    try:
        summary = await service.generate_quick_summary(topic, max_length)
        return {"topic": topic, "summary": summary}
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating summary",
        )


@router.get("/learning/explain/{concept}")
async def explain_concept(
    concept: str,
    detail_level: str = "intermediate",
    service: LearningService = Depends(get_learning_svc),
):
    """Get detailed explanation of a concept"""
    try:
        explanation = await service.generate_explanation(concept, detail_level)
        return {"concept": concept, "explanation": explanation}
    except Exception as e:
        logger.error(f"Error explaining concept: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating explanation",
        )


# Health check
@router.get("/health")
async def health_check():
    """Check LLM services health"""
    try:
        # Try to get Gemini client
        client = get_gemini_client()
        return {
            "status": "healthy",
            "gemini": "initialized",
            "mentor": get_mentor_service() is not None,
            "practice_review": get_practice_review_service() is not None,
            "interview": get_interview_service() is not None,
            "learning": get_learning_service() is not None,
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
        }

