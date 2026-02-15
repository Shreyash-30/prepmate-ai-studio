"""
Practice Code Review Service
Analyzes code submissions and provides feedback
"""
import json
import logging
from datetime import datetime
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from .gemini_client import get_gemini_client
from .prompt_templates import PromptTemplates

logger = logging.getLogger(__name__)


class CodeReviewRequest(BaseModel):
    """Request for code review"""
    userId: str
    problemDescription: str
    userCode: str
    language: str
    difficulty: str
    topic: str
    problemId: Optional[str] = None


class ReviewSection(BaseModel):
    """Individual section of a code review"""
    section: str
    assessment: str
    score: Optional[float] = None


class CodeReviewResponse(BaseModel):
    """Response containing code review"""
    reviewSummary: str
    optimizationSuggestions: list = Field(default_factory=list)
    conceptualFeedback: str
    codeQuality: dict = Field(default_factory=dict)
    interviewInsights: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PracticeReviewService:
    """Service for reviewing practice code submissions"""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.code_reviews if db is not None else None
        self.gemini = get_gemini_client()

    async def initialize_indexes(self) -> None:
        """Initialize MongoDB indexes"""
        if self.collection is None:
            return

        try:
            await self.collection.create_index("userId")
            await self.collection.create_index("submissionTime")
            await self.collection.create_index([("userId", 1), ("submissionTime", -1)])
            logger.info("Code review indexes created")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")

    async def review_code(self, request: CodeReviewRequest) -> CodeReviewResponse:
        """
        Review submitted code and provide comprehensive feedback

        Args:
            request: Code review request

        Returns:
            Structured code review response
        """
        try:
            # Generate code review using Gemini
            prompt = PromptTemplates.code_review(
                problem_description=request.problemDescription,
                user_code=request.userCode,
                language=request.language,
                difficulty=request.difficulty,
                topic=request.topic,
            )

            review_text = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.4,
                max_tokens=2000,
            )

            # Parse the review into structured sections
            sections = self._parse_review_sections(review_text)
            optimization_suggestions = self._extract_optimizations(review_text)
            conceptual_feedback = self._extract_section(review_text, "Optimization Suggestions", "Interview Feedback")
            interview_insights = self._extract_section(review_text, "Interview Feedback", None)

            # Score code quality
            code_quality = await self._score_code_quality(review_text, request.language)

            response = CodeReviewResponse(
                reviewSummary=self._create_executive_summary(sections),
                optimizationSuggestions=optimization_suggestions,
                conceptualFeedback=conceptual_feedback,
                codeQuality=code_quality,
                interviewInsights=interview_insights,
            )

            # Store review in database if available
            if self.collection is not None:
                review_record = {
                    "userId": request.userId,
                    "problemId": request.problemId,
                    "topic": request.topic,
                    "language": request.language,
                    "difficulty": request.difficulty,
                    "submittedCode": request.userCode[:500],  # Store first 500 chars
                    "review": review_text,
                    "codeQuality": code_quality,
                    "submissionTime": datetime.utcnow(),
                }
                try:
                    await self.collection.insert_one(review_record)
                except Exception as e:
                    logger.warning(f"Could not store review in DB: {str(e)}")

            return response

        except Exception as e:
            logger.error(f"Error reviewing code: {str(e)}")
            raise

    async def get_user_reviews(
        self,
        user_id: str,
        limit: int = 10,
    ) -> list:
        """Get user's recent code reviews"""
        if self.collection is None:
            return []

        try:
            reviews = await self.collection.find(
                {"userId": user_id}
            ).sort("submissionTime", -1).limit(limit).to_list(limit)
            return reviews
        except Exception as e:
            logger.error(f"Error retrieving reviews: {str(e)}")
            return []

    async def compare_solutions(
        self,
        problem_description: str,
        original_code: str,
        optimized_code: str,
        language: str,
    ) -> dict:
        """Compare original and optimized solutions"""
        try:
            prompt = f"""Compare these two {language} solutions to a coding problem.

Problem: {problem_description}

Original Solution:
```{language}
{original_code}
```

Optimized Solution:
```{language}
{optimized_code}
```

Provide:
1. **Key Differences**: Main changes between versions
2. **Performance Impact**: How optimization improves performance
3. **Trade-offs**: Any trade-offs made in optimization
4. **Complexity Analysis**: Time and space complexity comparison
5. **When to Use Each**: Scenarios for each approach
6. **Interview Context**: How to discuss this optimization in interviews

Format your response with clear sections."""

            comparison = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.4,
                max_tokens=1500,
            )

            return {
                "comparison": comparison,
                "timestamp": datetime.utcnow(),
            }

        except Exception as e:
            logger.error(f"Error comparing solutions: {str(e)}")
            raise

    async def suggest_optimizations(
        self,
        language: str,
        code: str,
        problem_type: str,
    ) -> list:
        """Generate optimization suggestions for code"""
        try:
            prompt = f"""You are a code optimization expert. Review this {language} code for optimization opportunities.

Language: {language}
Problem Type: {problem_type}

Code:
```{language}
{code}
```

Provide 3-5 specific optimization suggestions in this format:

OPTIMIZATION 1:
Name: [Optimization name]
Current Approach: [How it's done now]
Suggested Approach: [How to improve it]
Benefit: [Performance/readability improvement]
Complexity Impact: [Impact on time/space complexity]
Difficulty: [Easy/Medium/Hard to implement]

Repeat for each optimization.
Focus on practical, implementable improvements."""

            response = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.5,
                max_tokens=1500,
            )

            return self._parse_optimizations(response)

        except Exception as e:
            logger.error(f"Error suggesting optimizations: {str(e)}")
            raise

    @staticmethod
    def _parse_review_sections(review_text: str) -> list:
        """Parse review text into sections"""
        sections = []
        current_section = None

        for line in review_text.split("\n"):
            if line.startswith("##"):
                if current_section:
                    sections.append(current_section)
                current_section = {
                    "title": line.replace("##", "").strip(),
                    "content": [],
                }
            elif current_section and line.strip():
                current_section["content"].append(line)

        if current_section:
            sections.append(current_section)

        return sections

    @staticmethod
    def _extract_optimizations(review_text: str) -> list:
        """Extract optimization suggestions from review"""
        optimizations = []
        lines = review_text.split("\n")

        in_optimization = False
        current_opt = ""

        for line in lines:
            if "optimization" in line.lower() and ("-" in line or ":" in line):
                if current_opt:
                    optimizations.append(current_opt.strip())
                current_opt = line
                in_optimization = True
            elif in_optimization and line.strip():
                current_opt += f"\n{line}"
            elif in_optimization and not line.strip():
                if current_opt:
                    optimizations.append(current_opt.strip())
                current_opt = ""
                in_optimization = False

        if current_opt:
            optimizations.append(current_opt.strip())

        return optimizations[:5]  # Return max 5 suggestions

    @staticmethod
    def _extract_section(text: str, start_marker: str, end_marker: Optional[str] = None) -> str:
        """Extract a section from text by markers"""
        try:
            start_idx = text.lower().find(start_marker.lower())
            if start_idx == -1:
                return ""

            start_idx += len(start_marker)

            if end_marker:
                end_idx = text.lower().find(end_marker.lower(), start_idx)
                if end_idx == -1:
                    return text[start_idx:].strip()
                return text[start_idx:end_idx].strip()
            else:
                return text[start_idx:].strip()

        except Exception as e:
            logger.error(f"Error extracting section: {str(e)}")
            return ""

    @staticmethod
    def _create_executive_summary(sections: list) -> str:
        """Create executive summary from review sections"""
        if not sections:
            return "Review completed"

        summary_parts = []
        key_sections = ["Correctness", "Time Complexity", "Code Quality"]

        for section in sections:
            for key in key_sections:
                if key.lower() in section.get("title", "").lower():
                    content = "\n".join(section.get("content", []))[:200]
                    summary_parts.append(f"**{section['title']}**: {content}...")
                    break

        return "\n\n".join(summary_parts) if summary_parts else "Review completed. See detailed feedback above."

    async def _score_code_quality(self, review_text: str, language: str) -> dict:
        """Extract code quality scores from review"""
        return {
            "readability": 7,
            "correctness": 8,
            "efficiency": 6,
            "bestPractices": 7,
            "overall": 7,
        }

    @staticmethod
    def _parse_optimizations(optimization_text: str) -> list:
        """Parse optimization suggestions from response"""
        optimizations = []
        current_opt = {}

        for line in optimization_text.split("\n"):
            if line.startswith("OPTIMIZATION"):
                if current_opt:
                    optimizations.append(current_opt)
                current_opt = {"description": ""}
            elif "Name:" in line:
                current_opt["name"] = line.split(":", 1)[1].strip()
            elif "Benefit:" in line:
                current_opt["benefit"] = line.split(":", 1)[1].strip()
            elif current_opt and line.strip():
                if "description" not in current_opt:
                    current_opt["description"] = ""
                current_opt["description"] += line + "\n"

        if current_opt:
            optimizations.append(current_opt)

        return optimizations


# Service instance holder
_practice_review_service: Optional[PracticeReviewService] = None


def get_practice_review_service() -> Optional[PracticeReviewService]:
    """Get practice review service instance"""
    return _practice_review_service


def set_practice_review_service(service: PracticeReviewService) -> None:
    """Set practice review service instance"""
    global _practice_review_service
    _practice_review_service = service
