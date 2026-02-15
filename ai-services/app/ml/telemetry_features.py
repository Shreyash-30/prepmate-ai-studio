"""
Telemetry Feature Engineering - Feature Pipeline for ML Models
Aggregates practice data into features for mastery and readiness models.
"""
import logging
from typing import Dict, List
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class TelemetryFeatures:
    """Telemetry and feature engineering service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.submission_collection = db.submissions if db is not None else None
        logger.info("Telemetry Features initialized")
    
    async def compute_user_features(self, user_id: str) -> Dict:
        """
        Compute comprehensive feature vector for user
        
        Aggregates practice attempts, submissions, and performance
        """
        if not self.submission_collection:
            return self._default_features()
        
        try:
            # Aggregate submissions
            submissions = await self.submission_collection.find(
                {"userId": user_id}
            ).to_list(None)
            
            if not submissions:
                return self._default_features()
            
            # Compute features
            attempt_count = len(submissions)
            success_count = sum(1 for s in submissions if s.get("isCorrect"))
            success_rate = success_count / attempt_count if attempt_count > 0 else 0
            
            # Time features
            solve_times = [s.get("solveTime", 0) for s in submissions if s.get("solveTime")]
            avg_solve_time = sum(solve_times) / len(solve_times) if solve_times else 0
            
            # Hint usage
            hint_count = sum(s.get("hintsUsed", 0) for s in submissions)
            avg_hints = hint_count / attempt_count if attempt_count > 0 else 0
            
            # Difficulty progression
            difficulties = [s.get("difficulty", 1) for s in submissions]
            max_difficulty = max(difficulties) if difficulties else 1
            
            # Consistency metrics
            recent_submissions = submissions[-10:]  # Last 10
            recent_success = sum(1 for s in recent_submissions if s.get("isCorrect"))
            consistency = recent_success / len(recent_submissions) if recent_submissions else 0
            
            return {
                "attempt_count": attempt_count,
                "success_rate": success_rate,
                "avg_solve_time": avg_solve_time,
                "avg_hints_used": avg_hints,
                "max_difficulty_attempted": max_difficulty,
                "consistency_score": consistency,
                "engagement": min(1.0, attempt_count / 100.0),
            }
        
        except Exception as e:
            logger.error(f"Error computing features: {str(e)}")
            return self._default_features()
    
    def _default_features(self) -> Dict:
        """Return default feature vector"""
        return {
            "attempt_count": 0,
            "success_rate": 0.5,
            "avg_solve_time": 0,
            "avg_hints_used": 0,
            "max_difficulty_attempted": 1,
            "consistency_score": 0.5,
            "engagement": 0.0,
        }
