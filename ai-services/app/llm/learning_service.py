"""
Learning Content Generation Service
Generates educational content for interview preparation
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


class LearningContentRequest(BaseModel):
    """Request for generating learning content"""
    topic: str
    subject: str
    difficultyLevel: str = "medium"
    userKnowledgeLevel: int = 3
    contentType: Optional[str] = "comprehensive"  # comprehensive, summary, flashcards
    focusAreas: Optional[list] = None


class Flashcard(BaseModel):
    """Individual flashcard"""
    question: str
    answer: str
    difficulty: Optional[str] = None


class PracticeQuestion(BaseModel):
    """Practice question for learning"""
    question: str
    hint: str
    expectedApproach: str
    difficulty: str


class LearningContent(BaseModel):
    """Complete learning content"""
    topic: str
    summary: str
    keyConcepts: list = Field(default_factory=list)
    examples: list = Field(default_factory=list)
    flashcards: list = Field(default_factory=list)
    practiceQuestions: list = Field(default_factory=list)
    commonMistakes: list = Field(default_factory=list)
    nextTopics: list = Field(default_factory=list)
    visualExplanations: Optional[str] = None
    realWorldApplications: list = Field(default_factory=list)
    estimatedLearningTime: int  # in minutes
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class LearningService:
    """Service for generating learning content"""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.learning_content if db is not None else None
        self.gemini = get_gemini_client()

    async def initialize_indexes(self) -> None:
        """Initialize MongoDB indexes"""
        if self.collection is None:
            return

        try:
            await self.collection.create_index("topic")
            await self.collection.create_index("subject")
            await self.collection.create_index("createdAt")
            logger.info("Learning content indexes created")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")

    async def generate_learning_content(
        self,
        request: LearningContentRequest,
    ) -> LearningContent:
        """
        Generate comprehensive learning content for a topic

        Args:
            request: Learning content request

        Returns:
            Structured learning content
        """
        try:
            # Generate main content using Gemini
            prompt = PromptTemplates.learning_content_generation(
                topic=request.topic,
                subject=request.subject,
                difficulty_level=request.difficultyLevel,
                user_knowledge_level=request.userKnowledgeLevel,
            )

            content_text = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.6,
                max_tokens=3000,
            )

            # Parse the response into structured content
            summary = self._extract_summary(content_text)
            key_concepts = self._extract_key_concepts(content_text)
            flashcards = await self._generate_flashcards(request.topic, key_concepts)
            practice_questions = self._extract_practice_questions(content_text)
            common_mistakes = self._extract_mistakes(content_text)
            next_topics = self._extract_next_topics(content_text)
            visual_explanations = self._extract_visual_explanations(content_text)
            real_world_apps = self._extract_real_world_applications(content_text)

            # Estimate learning time (roughly 10 minutes per key concept + questions)
            estimated_time = len(key_concepts) * 10 + len(practice_questions) * 5

            learning_content = LearningContent(
                topic=request.topic,
                summary=summary,
                keyConcepts=key_concepts,
                examples=self._extract_examples(content_text),
                flashcards=flashcards,
                practiceQuestions=practice_questions,
                commonMistakes=common_mistakes,
                nextTopics=next_topics,
                visualExplanations=visual_explanations,
                realWorldApplications=real_world_apps,
                estimatedLearningTime=estimated_time,
            )

            # Store in database if available
            if self.collection is not None:
                content_record = {
                    "topic": request.topic,
                    "subject": request.subject,
                    "difficultyLevel": request.difficultyLevel,
                    "content": content_text,
                    "structuredContent": learning_content.dict(),
                    "createdAt": datetime.utcnow(),
                }
                try:
                    await self.collection.insert_one(content_record)
                except Exception as e:
                    logger.warning(f"Could not store learning content: {str(e)}")

            return learning_content

        except Exception as e:
            logger.error(f"Error generating learning content: {str(e)}")
            raise

    async def generate_quick_summary(
        self,
        topic: str,
        max_length: int = 500,
    ) -> str:
        """Generate a quick summary of a topic"""
        try:
            prompt = f"""Provide a concise {max_length}-character summary of '{topic}' for interview preparation.

Include:
1. What it is
2. Why it matters in interviews
3. Key points to remember

Keep it focused and practical."""

            summary = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.5,
                max_tokens=300,
            )

            return summary

        except Exception as e:
            logger.error(f"Error generating quick summary: {str(e)}")
            raise

    async def generate_explanation(
        self,
        concept: str,
        detail_level: str = "intermediate",
    ) -> str:
        """Generate detailed explanation of a concept"""
        try:
            prompt = PromptTemplates.concept_explanation(
                concept=concept,
                detail_level=detail_level,
            )

            explanation = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.5,
                max_tokens=1000,
            )

            return explanation

        except Exception as e:
            logger.error(f"Error generating explanation: {str(e)}")
            raise

    async def _generate_flashcards(
        self,
        topic: str,
        key_concepts: list,
    ) -> list:
        """Generate flashcards from key concepts"""
        try:
            concepts_str = "\n".join([f"- {c}" for c in key_concepts[:5]])

            prompt = f"""Create 5 study flashcards for '{topic}' based on these key concepts:

{concepts_str}

For each concept, create a question-answer pair suitable for interview preparation.

Format as:
Q: [Question]
A: [Answer]

Separate each pair with a blank line."""

            flashcards_text = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.5,
                max_tokens=800,
            )

            return self._parse_flashcards(flashcards_text)

        except Exception as e:
            logger.error(f"Error generating flashcards: {str(e)}")
            return []

    @staticmethod
    def _extract_summary(text: str) -> str:
        """Extract summary section from content"""
        lines = text.split("\n")

        in_summary = False
        summary_lines = []

        for line in lines:
            if "summary" in line.lower():
                in_summary = True
                continue
            if in_summary and ("##" in line or "**" in line):
                break

            if in_summary and line.strip():
                summary_lines.append(line)

        return "\n".join(summary_lines[:5]).strip() or "Summary: " + text[:200]

    @staticmethod
    def _extract_key_concepts(text: str) -> list:
        """Extract key concepts from content"""
        concepts = []
        lines = text.split("\n")

        in_concepts = False
        for line in lines:
            if "key concepts" in line.lower():
                in_concepts = True
                continue
            if in_concepts and ("##" in line or "**" in line) and "concept" not in line.lower():
                break

            if in_concepts and line.strip():
                cleaned = line.strip().lstrip("-•* 0123456789.):")
                if cleaned and len(cleaned) > 3:
                    # Extract just the concept name if there's a description after colon
                    if ":" in cleaned:
                        cleaned = cleaned.split(":")[0]
                    if cleaned not in concepts:
                        concepts.append(cleaned)

        return concepts[:7]

    @staticmethod
    def _extract_examples(text: str) -> list:
        """Extract examples from content"""
        examples = []
        lines = text.split("\n")

        in_examples = False
        current_example = ""

        for line in lines:
            if "example" in line.lower():
                in_examples = True
                if current_example:
                    examples.append(current_example.strip())
                current_example = ""
                continue

            if in_examples:
                if "##" in line or "**" in line:
                    if current_example:
                        examples.append(current_example.strip())
                    current_example = ""
                    in_examples = "example" in line.lower()
                else:
                    current_example += line + "\n"

        if current_example:
            examples.append(current_example.strip())

        return [e for e in examples if e][:4]

    @staticmethod
    def _extract_practice_questions(text: str) -> list:
        """Extract practice questions from content"""
        questions = []
        lines = text.split("\n")

        in_questions = False
        current_q = ""

        for line in lines:
            if "practice question" in line.lower():
                in_questions = True
                continue
            if in_questions and "##" in line:
                break

            if in_questions and line.strip():
                current_q += line + "\n"
                if "?" in line and len(current_q) > 20:
                    questions.append(current_q.strip())
                    current_q = ""

        return questions[:5]

    @staticmethod
    def _extract_mistakes(text: str) -> list:
        """Extract common mistakes from content"""
        mistakes = []
        lines = text.split("\n")

        in_mistakes = False
        for line in lines:
            if "mistake" in line.lower() or "pitfall" in line.lower():
                in_mistakes = True
                continue
            if in_mistakes and "##" in line:
                break

            if in_mistakes and line.strip():
                cleaned = line.strip().lstrip("-•* 0123456789.):")
                if cleaned:
                    mistakes.append(cleaned)

        return mistakes[:4]

    @staticmethod
    def _extract_next_topics(text: str) -> list:
        """Extract suggested next topics from content"""
        topics = []

        keywords = ["next", "further", "advanced", "related", "recommended"]
        lines = text.split("\n")

        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in keywords):
                # Look at next few lines
                for next_line in lines[i:min(i+5, len(lines))]:
                    if "-" in next_line or "•" in next_line:
                        cleaned = next_line.strip().lstrip("-•* 0123456789.):")
                        if cleaned:
                            topics.append(cleaned)

        return topics[:3]

    @staticmethod
    def _extract_visual_explanations(text: str) -> Optional[str]:
        """Extract ASCII diagrams or pseudocode"""
        lines = text.split("\n")

        in_visual = False
        visual = []

        for line in lines:
            if "```" in line or "ASCII" in line or "diagram" in line.lower():
                in_visual = not in_visual
                continue

            if in_visual:
                visual.append(line)

        return "\n".join(visual) if visual else None

    @staticmethod
    def _extract_real_world_applications(text: str) -> list:
        """Extract real-world applications"""
        apps = []
        lines = text.split("\n")

        in_apps = False
        for line in lines:
            if "application" in line.lower() or "real-world" in line.lower():
                in_apps = True
                continue
            if in_apps and "##" in line:
                break

            if in_apps and line.strip():
                cleaned = line.strip().lstrip("-•* 0123456789.):")
                if cleaned:
                    apps.append(cleaned)

        return apps[:3]

    @staticmethod
    def _parse_flashcards(text: str) -> list:
        """Parse flashcards from generated text"""
        flashcards = []
        pairs = text.split("\n\n")

        for pair in pairs:
            lines = pair.strip().split("\n")
            if len(lines) >= 2:
                q_line = next((l for l in lines if l.startswith("Q:")), None)
                a_line = next((l for l in lines if l.startswith("A:")), None)

                if q_line and a_line:
                    question = q_line.replace("Q:", "").strip()
                    answer = a_line.replace("A:", "").strip()
                    if question and answer:
                        flashcards.append(
                            Flashcard(
                                question=question,
                                answer=answer,
                            )
                        )

        return flashcards


# Service instance holder
_learning_service: Optional[LearningService] = None


def get_learning_service() -> Optional[LearningService]:
    """Get learning service instance"""
    return _learning_service


def set_learning_service(service: LearningService) -> None:
    """Set learning service instance"""
    global _learning_service
    _learning_service = service
