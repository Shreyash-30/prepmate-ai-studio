"""
Mastery Engine - Bayesian Knowledge Tracing
Estimates skill mastery probability and learning progress using BKT model.
"""
import logging
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class MasteryUpdateRequest(BaseModel):
    """Request model for mastery updates"""
    user_id: str
    topic_id: str
    attempts: List[Dict]  # [{correct: bool, difficulty: int, hints_used: int, time_ms: float}]
    learning_level: str = "beginner"  # beginner, intermediate, advanced


class MasteryMetrics(BaseModel):
    """Mastery estimation output"""
    mastery_probability: float  # 0-1
    confidence_score: float  # 0-1
    improvement_trend: str  # "improving", "stable", "declining"
    attempts_count: int
    last_attempt_timestamp: str
    recommended_difficulty: str
    explainability: Dict


class BayesianKnowledgeTracing:
    """Core BKT algorithm implementation"""
    
    # BKT Model Parameters
    # Defaults based on typical learning domains
    P_INIT = 0.1  # Initial probability of knowing skill
    P_LEARN = 0.15  # Probability of learning on attempt
    P_GUESS = 0.1  # Probability of guessing correctly
    P_SLIP = 0.05  # Probability of slipping (knows but answers wrong)
    
    def __init__(self):
        self.params = {
            "p_init": self.P_INIT,
            "p_learn": self.P_LEARN,
            "p_guess": self.P_GUESS,
            "p_slip": self.P_SLIP,
        }
    
    def update(
        self,
        prior: float,
        correct: bool,
        difficulty_factor: float = 1.0,
        hints_used: int = 0,
    ) -> Tuple[float, float]:
        """
        Update mastery probability using BKT
        
        Args:
            prior: Current mastery probability
            correct: Whether response was correct
            difficulty_factor: 0.5-2.0, adjusts learning rate
            hints_used: Number of hints used
            
        Returns:
            (posterior_probability, confidence_score)
        """
        # Adjust learning rate based on difficulty
        p_learn = self.params["p_learn"] * difficulty_factor
        
        # Reduce learning if hints were used
        if hints_used > 0:
            p_learn *= max(0.5, 1.0 - hints_used * 0.2)
        
        if correct:
            # Correct response
            # P(correct | knows) = 1 - P(slip)
            # P(correct | ~knows) = P(guess)
            p_correct_given_knows = 1 - self.params["p_slip"]
            p_correct_given_not_knows = self.params["p_guess"]
            
            # Update: P(knows | correct)
            p_knows_after_attempt = prior * p_correct_given_knows / (
                prior * p_correct_given_knows
                + (1 - prior) * p_correct_given_not_knows
            )
            
            # Apply learning
            posterior = p_knows_after_attempt + (
                (1 - p_knows_after_attempt) * p_learn
            )
        else:
            # Incorrect response
            p_incorrect_given_knows = self.params["p_slip"]
            p_incorrect_given_not_knows = 1 - self.params["p_guess"]
            
            # Update: P(knows | incorrect)
            p_knows_after_attempt = (
                prior
                * p_incorrect_given_knows
                / (
                    prior * p_incorrect_given_knows
                    + (1 - prior) * p_incorrect_given_not_knows
                )
            )
            
            # No learning on incorrect, but may decay
            posterior = p_knows_after_attempt * 0.95
        
        # Clamp to valid range
        posterior = np.clip(posterior, 0.0, 1.0)
        
        # Confidence based on number of observations and clarity
        confidence = 1.0 - np.exp(-abs(posterior - 0.5) * 2)
        confidence = np.clip(confidence, 0.0, 1.0)
        
        return float(posterior), float(confidence)
    
    def batch_update(self, prior: float, attempts: List[Dict]) -> Tuple[float, float]:
        """
        Process multiple attempts sequentially
        
        Args:
            prior: Initial mastery probability
            attempts: List of attempt dicts
            
        Returns:
            (final_probability, average_confidence)
        """
        current = prior
        confidences = []
        
        for attempt in attempts:
            correct = attempt.get("correct", False)
            difficulty = attempt.get("difficulty", 1.0)
            hints = attempt.get("hints_used", 0)
            time_factor = attempt.get("time_factor", 1.0)
            
            # Adjust difficulty factor
            diff_factor = 0.5 + (difficulty / 3.0)
            
            current, conf = self.update(current, correct, diff_factor, hints)
            confidences.append(conf)
        
        avg_confidence = float(np.mean(confidences)) if confidences else 0.5
        return current, avg_confidence


class MasteryEngine:
    """Skill mastery estimation service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.topic_mastery if db is not None else None
        self.bkt = BayesianKnowledgeTracing()
        logger.info("Mastery Engine initialized")
    
    async def initialize_indexes(self) -> None:
        """Initialize MongoDB indexes"""
        if self.collection is None:
            return
        
        try:
            await self.collection.create_index("userId")
            await self.collection.create_index("topicId")
            await self.collection.create_index([("userId", 1), ("topicId", 1)], unique=True)
            await self.collection.create_index("lastUpdated")
            logger.info("Mastery Engine indexes created")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
    
    async def update_mastery(self, request: MasteryUpdateRequest) -> MasteryMetrics:
        """
        Update mastery estimate for a topic
        
        Args:
            request: Update request with attempts
            
        Returns:
            Mastery metrics and explainability
        """
        try:
            # Get current mastery state
            current_doc = None
            if self.collection is not None:
                current_doc = await self.collection.find_one({
                    "userId": request.user_id,
                    "topicId": request.topic_id,
                })
            
            prior = current_doc.get("mastery_probability", 0.1) if current_doc else 0.1
            
            # Process attempts
            posterior, confidence = self.bkt.batch_update(prior, request.attempts)
            
            # Calculate improvement trend
            if current_doc:
                previous = current_doc.get("mastery_probability", prior)
                if posterior > previous + 0.05:
                    trend = "improving"
                elif posterior < previous - 0.05:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "improving" if posterior > prior else "stable"
            
            # Determine recommended difficulty
            if posterior < 0.4:
                rec_difficulty = "easy"
            elif posterior < 0.7:
                rec_difficulty = "medium"
            else:
                rec_difficulty = "hard"
            
            # Build explainability
            correct_count = sum(1 for a in request.attempts if a.get("correct"))
            total_attempts = len(request.attempts)
            
            explainability = {
                "reason": f"Mastery estimated at {posterior:.1%} based on {total_attempts} attempts",
                "success_rate": f"{correct_count/total_attempts*100:.0f}%",
                "model": "Bayesian Knowledge Tracing",
                "factors": [
                    f"Prior knowledge: {prior:.1%}",
                    f"Recent performance: {correct_count}/{total_attempts} correct",
                    f"Confidence: {confidence:.0%}",
                    f"Trend: {trend}",
                ],
            }
            
            # Store in database
            if self.collection is not None:
                update_data = {
                    "userId": request.user_id,
                    "topicId": request.topic_id,
                    "mastery_probability": posterior,
                    "confidence_score": confidence,
                    "improvement_trend": trend,
                    "attempts_count": (current_doc.get("attempts_count", 0) + total_attempts) if current_doc else total_attempts,
                    "last_attempt_timestamp": datetime.utcnow().isoformat(),
                    "recommended_difficulty": rec_difficulty,
                    "updatedAt": datetime.utcnow(),
                }
                
                await self.collection.update_one(
                    {
                        "userId": request.user_id,
                        "topicId": request.topic_id,
                    },
                    {"$set": update_data},
                    upsert=True,
                )
            
            return MasteryMetrics(
                mastery_probability=posterior,
                confidence_score=confidence,
                improvement_trend=trend,
                attempts_count=update_data.get("attempts_count", 0) if self.collection else total_attempts,
                last_attempt_timestamp=datetime.utcnow().isoformat(),
                recommended_difficulty=rec_difficulty,
                explainability=explainability,
            )
        
        except Exception as e:
            logger.error(f"Error updating mastery: {str(e)}")
            raise
    
    async def get_mastery(self, user_id: str, topic_id: str) -> Optional[Dict]:
        """Get current mastery estimate"""
        if self.collection is None:
            return None
        
        try:
            doc = await self.collection.find_one({
                "userId": user_id,
                "topicId": topic_id,
            })
            return doc
        except Exception as e:
            logger.error(f"Error retrieving mastery: {str(e)}")
            return None
    
    async def get_user_mastery_profile(self, user_id: str) -> Dict:
        """Get mastery estimates across all topics"""
        if self.collection is None:
            return {"topics": []}
        
        try:
            topics = await self.collection.find({"userId": user_id}).to_list(None)
            
            # Calculate aggregate stats
            masteries = [t.get("mastery_probability", 0) for t in topics]
            if masteries:
                avg_mastery = float(np.mean(masteries))
                strong_topics = sum(1 for m in masteries if m > 0.7)
                weak_topics = sum(1 for m in masteries if m < 0.4)
            else:
                avg_mastery = 0
                strong_topics = 0
                weak_topics = 0
            
            return {
                "user_id": user_id,
                "average_mastery": avg_mastery,
                "topics_count": len(topics),
                "strong_topics": strong_topics,
                "weak_topics": weak_topics,
                "topics": [
                    {
                        "topic_id": t["topicId"],
                        "mastery": t.get("mastery_probability", 0),
                        "confidence": t.get("confidence_score", 0),
                        "trend": t.get("improvement_trend", "unknown"),
                        "attempts": t.get("attempts_count", 0),
                    }
                    for t in topics
                ],
            }
        except Exception as e:
            logger.error(f"Error retrieving user profile: {str(e)}")
            return {"topics": []}
