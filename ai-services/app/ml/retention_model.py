"""
Retention Model - Exponential Forgetting Curve & Spaced Repetition
Implements Ebbinghaus forgetting curve for optimal revision scheduling.
"""
import logging
import math
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class RetentionUpdateRequest(BaseModel):
    """Request for retention update"""
    user_id: str
    topic_id: str
    is_successful_revision: bool
    time_since_last_revision_hours: float


class RetentionMetrics(BaseModel):
    """Retention estimate output"""
    retention_probability: float  # 0-1: probability user remembers
    stability_score: float  # 0-1: stability of memory
    next_revision_date: str  # ISO format
    days_until_revision: int
    urgency_level: str  # "critical", "high", "medium", "low"
    explainability: Dict


class EbbinghausForgettingCurve:
    """Ebbinghaus forgetting curve implementation"""
    
    # Empirically calibrated parameters
    DEFAULT_STABILITY = 3.0  # Default memory stability (days)
    
    @staticmethod
    def retention_probability(time_elapsed_hours: float, stability_days: float) -> float:
        """
        Calculate retention probability using Ebbinghaus curve
        
        Formula: R(t) = exp(-t / S)
        Where:
            R(t) = retention probability at time t
            t = time elapsed (in days)
            S = stability (characteristic time, in days)
        
        Args:
            time_elapsed_hours: Hours since last exposure
            stability_days: Memory stability parameter
            
        Returns:
            Retention probability (0-1)
        """
        if stability_days <= 0:
            stability_days = EbbinghausForgettingCurve.DEFAULT_STABILITY
        
        time_days = time_elapsed_hours / 24.0
        retention = math.exp(-time_days / stability_days)
        return max(0.0, min(1.0, retention))
    
    @staticmethod
    def update_stability(
        current_stability: float,
        successful_revision: bool,
        retention_at_review: float,
    ) -> float:
        """
        Update stability after a revision/review
        
        Inspired by SM-2 algorithm from Anki
        
        Args:
            current_stability: Current stability value (days)
            successful_revision: Whether revision was successful
            retention_at_review: Retention probability at review time
            
        Returns:
            Updated stability value
        """
        if successful_revision:
            # Increase stability
            # Factor = 1.3 for successful recall
            factor = 1.3 * (2.0 - (1.0 - retention_at_review))
            new_stability = current_stability * factor
        else:
            # Decrease stability on failure
            # Reset to a higher initial value
            new_stability = current_stability * 0.5
        
        # Bound stability
        new_stability = max(1.0, min(30.0, new_stability))
        return new_stability
    
    @staticmethod
    def compute_next_revision_time(
        current_stability: float,
        target_retention: float = 0.9,
    ) -> timedelta:
        """
        Compute optimal next revision time to maintain target retention
        
        Args:
            current_stability: Current stability (days)
            target_retention: Desired retention probability (default 90%)
            
        Returns:
            Timedelta for next revision
        """
        # Solve: retention_target = exp(-t / stability)
        # log(retention_target) = -t / stability
        # t = -stability * log(retention_target)
        
        if current_stability <= 0 or target_retention >= 1.0:
            return timedelta(days=3)  # Default fallback
        
        time_days = -current_stability * math.log(target_retention)
        time_days = max(1, min(30, time_days))  # Clamp to 1-30 days
        
        return timedelta(days=time_days)


class RetentionModel:
    """Retention and revision scheduling service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.revision_schedule if db is not None else None
        self.forgetting_curve = EbbinghausForgettingCurve()
        logger.info("Retention Model initialized")
    
    async def initialize_indexes(self) -> None:
        """Initialize MongoDB indexes"""
        if self.collection is None:
            return
        
        try:
            await self.collection.create_index("userId")
            await self.collection.create_index([("userId", 1), ("topicId", 1)], unique=True)
            await self.collection.create_index("nextRevisionDate")
            await self.collection.create_index([("userId", 1), ("nextRevisionDate", 1)])
            logger.info("Retention Model indexes created")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
    
    async def update_retention(self, request: RetentionUpdateRequest) -> RetentionMetrics:
        """
        Update retention and compute next revision time
        
        Args:
            request: Retention update request
            
        Returns:
            Retention metrics and recommendation
        """
        try:
            # Get current retention record
            current_doc = None
            if self.collection is not None:
                current_doc = await self.collection.find_one({
                    "userId": request.user_id,
                    "topicId": request.topic_id,
                })
            
            # Initialize values
            current_stability = current_doc.get("stability_score", self.forgetting_curve.DEFAULT_STABILITY) if current_doc else self.forgetting_curve.DEFAULT_STABILITY
            last_revision = current_doc.get("lastRevisionDate") if current_doc else None
            
            # Calculate retention at this moment
            if last_revision:
                if isinstance(last_revision, str):
                    last_revision = datetime.fromisoformat(last_revision)
                time_since_last = (datetime.utcnow() - last_revision).total_seconds() / 3600.0
            else:
                time_since_last = request.time_since_last_revision_hours
            
            retention_now = self.forgetting_curve.retention_probability(
                time_since_last,
                current_stability,
            )
            
            # Update stability based on revision result
            new_stability = self.forgetting_curve.update_stability(
                current_stability,
                request.is_successful_revision,
                retention_now,
            )
            
            # Compute next revision date
            next_revision_delta = self.forgetting_curve.compute_next_revision_time(
                new_stability,
                target_retention=0.9,
            )
            next_revision_date = datetime.utcnow() + next_revision_delta
            days_until = next_revision_delta.days
            
            # Determine urgency level
            if retention_now < 0.3:
                urgency = "critical"
            elif retention_now < 0.5:
                urgency = "high"
            elif retention_now < 0.75:
                urgency = "medium"
            else:
                urgency = "low"
            
            # Build explainability
            explainability = {
                "reason": f"Based on {('successful' if request.is_successful_revision else 'unsuccessful')} revision",
                "model": "Ebbinghaus Forgetting Curve + SM-2 Spacing",
                "factors": [
                    f"Current retention: {retention_now:.1%}",
                    f"Memory stability: {new_stability:.1f} days",
                    f"Time since last review: {time_since_last:.1f} hours",
                    f"Next review scheduled in {days_until} days",
                    f"Urgency: {urgency}",
                ],
            }
            
            # Store in database
            if self.collection is not None:
                update_data = {
                    "userId": request.user_id,
                    "topicId": request.topic_id,
                    "retention_probability": retention_now,
                    "stability_score": new_stability,
                    "nextRevisionDate": next_revision_date.isoformat(),
                    "lastRevisionDate": datetime.utcnow().isoformat(),
                    "isSuccessful": request.is_successful_revision,
                    "revisionCount": (current_doc.get("revisionCount", 0) + 1) if current_doc else 1,
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
            
            return RetentionMetrics(
                retention_probability=retention_now,
                stability_score=new_stability,
                next_revision_date=next_revision_date.isoformat(),
                days_until_revision=days_until,
                urgency_level=urgency,
                explainability=explainability,
            )
        
        except Exception as e:
            logger.error(f"Error updating retention: {str(e)}")
            raise
    
    async def get_revision_queue(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get topics needing revision (ordered by urgency)"""
        if self.collection is None:
            return []
        
        try:
            now = datetime.utcnow()
            revisions = await self.collection.find(
                {
                    "userId": user_id,
                    "nextRevisionDate": {"$lte": now},
                }
            ).sort("nextRevisionDate", 1).limit(limit).to_list(limit)
            
            return [
                {
                    "topic_id": r["topicId"],
                    "retention": r.get("retention_probability", 0),
                    "stability": r.get("stability_score", 0),
                    "days_overdue": (
                        (now - datetime.fromisoformat(r["nextRevisionDate"])).days
                        if isinstance(r["nextRevisionDate"], str)
                        else (now - r["nextRevisionDate"]).days
                    ),
                }
                for r in revisions
            ]
        except Exception as e:
            logger.error(f"Error retrieving revision queue: {str(e)}")
            return []
    
    async def get_retention_snapshot(self, user_id: str) -> Dict:
        """Get retention snapshot across all topics"""
        if self.collection is None:
            return {"topics": [], "average_retention": 0}
        
        try:
            topics = await self.collection.find({"userId": user_id}).to_list(None)
            
            retentions = [t.get("retention_probability", 0) for t in topics]
            avg_retention = sum(retentions) / len(retentions) if retentions else 0.0
            
            overdue_count = sum(
                1
                for t in topics
                if datetime.fromisoformat(t["nextRevisionDate"]) <= datetime.utcnow()
                if isinstance(t["nextRevisionDate"], str)
            )
            
            return {
                "user_id": user_id,
                "average_retention": avg_retention,
                "topics_count": len(topics),
                "overdue_revisions": overdue_count,
                "topics": [
                    {
                        "topic_id": t["topicId"],
                        "retention": t.get("retention_probability", 0),
                        "stability": t.get("stability_score", 0),
                        "next_revision_date": t.get("nextRevisionDate"),
                    }
                    for t in topics
                ],
            }
        except Exception as e:
            logger.error(f"Error retrieving retention snapshot: {str(e)}")
            return {"topics": [], "average_retention": 0}
