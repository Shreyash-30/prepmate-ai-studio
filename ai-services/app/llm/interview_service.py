"""
Interview Simulation Service
Simulates technical interviews and evaluates responses
"""
import json
import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from .gemini_client import get_gemini_client
from .prompt_templates import PromptTemplates

logger = logging.getLogger(__name__)


class InterviewSimulationRequest(BaseModel):
    """Request for interview simulation"""
    userId: str
    problemContext: str
    candidateExplanation: str
    topic: str
    difficulty: Optional[str] = "medium"
    interviewSessionId: Optional[str] = None


class InterviewEvaluation(BaseModel):
    """Evaluation of interview performance"""
    communicationScore: float
    technicalAccuracy: float
    problemSolvingApproach: float
    overallScore: float


class InterviewSimulationResponse(BaseModel):
    """Response from interview simulation"""
    interviewSessionId: str
    followUpQuestions: list = Field(default_factory=list)
    reasoningFeedback: str
    communicationScoreEstimate: float
    technicalFeedback: str
    strengths: list = Field(default_factory=list)
    areasForImprovement: list = Field(default_factory=list)
    suggestions: list = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class InterviewService:
    """Service for interview simulation and evaluation"""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.interview_sessions if db is not None else None
        self.gemini = get_gemini_client()

    async def initialize_indexes(self) -> None:
        """Initialize MongoDB indexes"""
        if self.collection is None:
            return

        try:
            await self.collection.create_index("userId")
            await self.collection.create_index("sessionId", unique=True)
            await self.collection.create_index("createdAt")
            await self.collection.create_index([("userId", 1), ("createdAt", -1)])
            logger.info("Interview session indexes created")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")

    async def simulate_interview(
        self,
        request: InterviewSimulationRequest,
    ) -> InterviewSimulationResponse:
        """
        Simulate technical interview and provide feedback

        Args:
            request: Interview simulation request

        Returns:
            Interview simulation response with evaluation
        """
        try:
            # Create or retrieve session
            if not request.interviewSessionId:
                session_id = str(uuid4())
            else:
                session_id = request.interviewSessionId

            # Generate interview follow-up questions and feedback
            prompt = PromptTemplates.interview_follow_up(
                problem_context=request.problemContext,
                candidate_explanation=request.candidateExplanation,
                topic=request.topic,
            )

            response_text = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.6,
                max_tokens=1500,
            )

            # Parse response
            follow_up_questions = self._extract_follow_up_questions(response_text)
            reasoning_feedback = self._extract_section(response_text, "REASONING_EVALUATION")
            comm_score = self._extract_communication_score(response_text)
            technical_feedback = await self._generate_technical_feedback(
                request.problemContext,
                request.candidateExplanation,
                request.topic,
            )
            strengths = self._extract_strengths(technical_feedback)
            improvements = self._extract_improvements(technical_feedback)
            suggestions = self._generate_suggestions(
                improvements,
                request.topic,
            )

            interview_response = InterviewSimulationResponse(
                interviewSessionId=session_id,
                followUpQuestions=follow_up_questions,
                reasoningFeedback=reasoning_feedback,
                communicationScoreEstimate=comm_score,
                technicalFeedback=technical_feedback,
                strengths=strengths,
                areasForImprovement=improvements,
                suggestions=suggestions,
            )

            # Store session in database if available
            if self.collection is not None:
                session_record = {
                    "userId": request.userId,
                    "sessionId": session_id,
                    "topic": request.topic,
                    "difficulty": request.difficulty,
                    "problemContext": request.problemContext,
                    "candidateExplanation": request.candidateExplanation,
                    "evaluation": {
                        "communicationScore": comm_score,
                        "followUpQuestions": follow_up_questions,
                    },
                    "createdAt": datetime.utcnow(),
                }
                try:
                    await self.collection.insert_one(session_record)
                except Exception as e:
                    logger.warning(f"Could not store interview session: {str(e)}")

            return interview_response

        except Exception as e:
            logger.error(f"Error in interview simulation: {str(e)}")
            raise

    async def get_interview_session(self, session_id: str) -> Optional[dict]:
        """Retrieve an interview session"""
        if self.collection is None:
            return None

        try:
            return await self.collection.find_one({"sessionId": session_id})
        except Exception as e:
            logger.error(f"Error retrieving interview session: {str(e)}")
            return None

    async def get_user_interview_history(
        self,
        user_id: str,
        limit: int = 10,
    ) -> list:
        """Get user's interview simulation history"""
        if self.collection is None:
            return []

        try:
            sessions = await self.collection.find(
                {"userId": user_id}
            ).sort("createdAt", -1).limit(limit).to_list(limit)
            return sessions
        except Exception as e:
            logger.error(f"Error retrieving interview history: {str(e)}")
            return []

    async def compare_interview_progress(
        self,
        user_id: str,
    ) -> Optional[dict]:
        """Compare interview performance over time"""
        if self.collection is None:
            return None

        try:
            sessions = await self.get_user_interview_history(user_id, limit=5)
            if not sessions:
                return None

            scores = [s.get("evaluation", {}).get("communicationScore", 0) for s in sessions]
            average_score = sum(scores) / len(scores) if scores else 0

            progression = {
                "totalSessions": len(sessions),
                "averageScore": average_score,
                "improvementTrend": "improving" if scores[-1] > scores[0] else "declining" if scores[-1] < scores[0] else "stable",
                "scores": scores[::-1],  # Reverse to show chronologically
                "topicsAttempted": list(set(s.get("topic") for s in sessions)),
            }

            return progression

        except Exception as e:
            logger.error(f"Error comparing progress: {str(e)}")
            return None

    @staticmethod
    def _extract_follow_up_questions(response_text: str) -> list:
        """Extract follow-up questions from response"""
        questions = []
        lines = response_text.split("\n")

        in_questions = False
        for line in lines:
            if "FOLLOW_UP_QUESTIONS" in line:
                in_questions = True
                continue
            if "REASONING_EVALUATION" in line:
                in_questions = False
                continue

            if in_questions and line.strip():
                # Clean up question text
                cleaned = line.strip()
                if cleaned.startswith(("-", "*", "•")) or (cleaned[0].isdigit() and cleaned[1] in ".):"):
                    cleaned = cleaned.lstrip("-*•0123456789.):")
                    cleaned = cleaned.strip()

                if len(cleaned) > 10 and "?" in cleaned:
                    questions.append(cleaned)

        return questions[:4]  # Return max 4 questions

    @staticmethod
    def _extract_communication_score(response_text: str) -> float:
        """Extract communication score from response"""
        lines = response_text.split("\n")

        for line in lines:
            if "COMMUNICATION_SCORE" in line:
                # Try to extract a number
                parts = line.split(":")
                if len(parts) > 1:
                    try:
                        score_str = parts[1].strip().split()[0]
                        score = float(score_str)
                        return min(max(score, 1), 10)  # Clamp to 1-10
                    except (ValueError, IndexError):
                        pass

        return 7.0  # Default score

    @staticmethod
    def _extract_section(text: str, marker: str) -> str:
        """Extract a section from text"""
        try:
            start_idx = text.find(marker)
            if start_idx == -1:
                return ""

            # Find the next section or end of text
            remaining = text[start_idx + len(marker):]
            next_section = remaining.find("\n\n")

            if next_section == -1:
                return remaining.strip()
            else:
                return remaining[:next_section].strip()

        except Exception as e:
            logger.error(f"Error extracting section: {str(e)}")
            return ""

    async def _generate_technical_feedback(
        self,
        problem_context: str,
        candidate_explanation: str,
        topic: str,
    ) -> str:
        """Generate detailed technical feedback"""
        try:
            prompt = f"""Provide technical feedback on this interview response.

Problem: {problem_context}

Candidate's Explanation: {candidate_explanation}

Topic: {topic}

Evaluate:
1. **Correctness**: Is the solution correct?
2. **Completeness**: Did they address all aspects?
3. **Technical Depth**: Do they understand the underlying concepts?
4. **Trade-offs**: Did they discuss complexity and trade-offs?
5. **Clarity**: How clearly was the solution explained?

Format as:
STRENGTHS: [What they did well]
IMPROVEMENTS: [What could be better]
SUGGESTIONS: [Specific recommendations]"""

            feedback = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.5,
                max_tokens=800,
            )

            return feedback

        except Exception as e:
            logger.error(f"Error generating technical feedback: {str(e)}")
            return "Unable to generate detailed feedback."

    @staticmethod
    def _extract_strengths(feedback: str) -> list:
        """Extract strengths from feedback"""
        strengths = []
        lines = feedback.split("\n")

        in_strengths = False
        for line in lines:
            if "STRENGTHS" in line:
                in_strengths = True
                continue
            if "IMPROVEMENTS" in line:
                in_strengths = False
                continue

            if in_strengths and line.strip() and not line.startswith("#"):
                cleaned = line.strip().lstrip("-•* ")
                if cleaned:
                    strengths.append(cleaned)

        return strengths[:3]

    @staticmethod
    def _extract_improvements(feedback: str) -> list:
        """Extract areas for improvement from feedback"""
        improvements = []
        lines = feedback.split("\n")

        in_improvements = False
        for line in lines:
            if "IMPROVEMENTS" in line:
                in_improvements = True
                continue
            if "SUGGESTIONS" in line:
                in_improvements = False
                continue

            if in_improvements and line.strip() and not line.startswith("#"):
                cleaned = line.strip().lstrip("-•* ")
                if cleaned:
                    improvements.append(cleaned)

        return improvements[:3]

    @staticmethod
    def _generate_suggestions(improvements: list, topic: str) -> list:
        """Generate actionable suggestions based on improvements"""
        suggestions = []

        suggestion_map = {
            "complexity": f"Study time and space complexity analysis for {topic}",
            "code": "Practice writing cleaner, more readable code",
            "communication": "Work on explaining your solution step-by-step",
            "edge case": f"Research edge cases common in {topic} problems",
            "optimization": "Focus on multiple approaches and trade-offs",
        }

        for improvement in improvements[:2]:
            lower = improvement.lower()
            for key, suggestion in suggestion_map.items():
                if key in lower:
                    suggestions.append(suggestion)
                    break

        if not suggestions:
            suggestions = [
                f"Review common {topic} interview patterns",
                "Practice explaining solutions without looking at code",
            ]

        return suggestions[:3]


# Service instance holder
_interview_service: Optional[InterviewService] = None


def get_interview_service() -> Optional[InterviewService]:
    """Get interview service instance"""
    return _interview_service


def set_interview_service(service: InterviewService) -> None:
    """Set interview service instance"""
    global _interview_service
    _interview_service = service
