"""
AI Mentor Service
Handles mentor-style conversations and explanations
"""
import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from .gemini_client import get_gemini_client
from .prompt_templates import PromptTemplates, build_mentor_prompt_with_history

logger = logging.getLogger(__name__)


class MentorMessage(BaseModel):
    """Individual message in conversation"""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MentorChatRequest(BaseModel):
    """Request model for mentor chat"""
    userId: str
    topic: str
    userMessage: str
    preparationContext: Optional[str] = None
    masteryScore: Optional[float] = None
    conversationId: Optional[str] = None


class MentorChatResponse(BaseModel):
    """Response model for mentor chat"""
    conversationId: str
    mentorResponse: str
    suggestedActions: list = Field(default_factory=list)
    topic: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MentorService:
    """Service for AI mentor interactions"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.mentor_conversations
        self.gemini = get_gemini_client()

    async def initialize_indexes(self) -> None:
        """Initialize MongoDB indexes for mentor conversations"""
        try:
            await self.collection.create_index("userId")
            await self.collection.create_index("conversationId", unique=True)
            await self.collection.create_index("createdAt")
            await self.collection.create_index([("userId", 1), ("createdAt", -1)])
            logger.info("Mentor conversation indexes created")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")

    async def chat(self, request: MentorChatRequest) -> MentorChatResponse:
        """
        Handle mentor chat interaction

        Args:
            request: Mentor chat request

        Returns:
            Mentor chat response
        """
        try:
            # Create or retrieve conversation
            if request.conversationId:
                conversation = await self.collection.find_one(
                    {"conversationId": request.conversationId}
                )
                if not conversation:
                    raise ValueError(f"Conversation {request.conversationId} not found")
            else:
                conversation_id = str(uuid4())
                conversation = {
                    "conversationId": conversation_id,
                    "userId": request.userId,
                    "messages": [],
                    "topic": request.topic,
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow(),
                }
                await self.collection.insert_one(conversation)
                request.conversationId = conversation_id

            # Add user message to history
            user_message = {
                "role": "user",
                "content": request.userMessage,
                "timestamp": datetime.utcnow(),
            }
            conversation["messages"].append(user_message)

            # Build context from recent messages (last 4 messages for context)
            context_messages = conversation["messages"][-4:-1] if len(conversation["messages"]) > 1 else []
            conversation_context = self._format_messages_for_context(context_messages)

            # Generate mentor response
            prompt = build_mentor_prompt_with_history(
                topic=request.topic,
                user_message=request.userMessage,
                conversation_context=conversation_context,
                mastery_score=request.masteryScore,
            )

            mentor_response = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.7,
                max_tokens=1500,
            )

            # Add assistant response to history
            assistant_message = {
                "role": "assistant",
                "content": mentor_response,
                "timestamp": datetime.utcnow(),
            }
            conversation["messages"].append(assistant_message)

            # Extract suggested actions from response
            suggested_actions = self._extract_suggested_actions(mentor_response)

            # Update conversation in database
            await self.collection.update_one(
                {"conversationId": request.conversationId},
                {
                    "$set": {
                        "messages": conversation["messages"],
                        "updatedAt": datetime.utcnow(),
                    }
                },
            )

            return MentorChatResponse(
                conversationId=request.conversationId,
                mentorResponse=mentor_response,
                suggestedActions=suggested_actions,
                topic=request.topic,
            )

        except Exception as e:
            logger.error(f"Error in mentor chat: {str(e)}")
            raise

    async def get_conversation(self, conversation_id: str) -> Optional[dict]:
        """Retrieve a conversation by ID"""
        try:
            return await self.collection.find_one({"conversationId": conversation_id})
        except Exception as e:
            logger.error(f"Error retrieving conversation: {str(e)}")
            return None

    async def get_user_conversations(
        self,
        user_id: str,
        limit: int = 10,
    ) -> list:
        """Get user's recent conversations"""
        try:
            conversations = await self.collection.find(
                {"userId": user_id}
            ).sort("createdAt", -1).limit(limit).to_list(limit)
            return conversations
        except Exception as e:
            logger.error(f"Error retrieving user conversations: {str(e)}")
            return []

    async def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation"""
        try:
            result = await self.collection.delete_one({"conversationId": conversation_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting conversation: {str(e)}")
            return False

    @staticmethod
    def _format_messages_for_context(messages: list) -> str:
        """Format previous messages for context in prompt"""
        if not messages:
            return ""

        formatted = "Previous conversation:\n"
        for msg in messages:
            role = "Student" if msg["role"] == "user" else "Mentor"
            formatted += f"{role}: {msg['content']}\n\n"
        return formatted.strip()

    @staticmethod
    def _extract_suggested_actions(response: str) -> list:
        """Extract suggested actions from response"""
        actions = []

        # Look for common action patterns in response
        action_patterns = [
            "practice",
            "review",
            "study",
            "focus on",
            "try",
            "implement",
            "solve",
            "read about",
        ]

        sentences = response.split(".")
        for sentence in sentences:
            sentence_lower = sentence.lower()
            for pattern in action_patterns:
                if pattern in sentence_lower:
                    cleaned = sentence.strip()
                    if cleaned and len(cleaned) > 10:
                        actions.append(cleaned)
                    break

        return actions[:3]  # Return max 3 suggested actions

    async def get_conversation_summary(self, conversation_id: str) -> Optional[str]:
        """Generate a summary of conversation using Gemini"""
        try:
            conversation = await self.get_conversation(conversation_id)
            if not conversation:
                return None

            # Format messages for summarization
            messages_text = "\n".join(
                [f"{msg['role']}: {msg['content']}" for msg in conversation["messages"]]
            )

            prompt = f"""Provide a concise summary of this mentor-student conversation about {conversation['topic']}:

{messages_text}

Summary should include:
1. Main question asked
2. Key points covered
3. Recommendations given
4. Learning outcomes"""

            summary = await self.gemini.generate_response(
                prompt=prompt,
                temperature=0.3,
                max_tokens=500,
            )

            return summary

        except Exception as e:
            logger.error(f"Error generating conversation summary: {str(e)}")
            return None


# Service instance holder
_mentor_service: Optional[MentorService] = None


def get_mentor_service() -> Optional[MentorService]:
    """Get mentor service instance"""
    return _mentor_service


def set_mentor_service(service: MentorService) -> None:
    """Set mentor service instance"""
    global _mentor_service
    _mentor_service = service
