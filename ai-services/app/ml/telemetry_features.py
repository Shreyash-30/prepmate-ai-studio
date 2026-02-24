"""
Telemetry Feature Engineering - Feature Pipeline for ML Models
Aggregates practice data into features for mastery and readiness models.

Phase 4 Enhancement:
- Extracts features from PracticeSession telemetry (not just submissions)
- Includes independence_score, dependency metrics
- Incorporates explanation quality scores
- Maintains backward compatibility with legacy submission data
"""
import logging
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class TelemetryFeatures:
    """Telemetry and feature engineering service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.submission_collection = db.submissions if db is not None else None
        self.practice_session_collection = db.practice_sessions if db is not None else None
        self.user_topic_progression_collection = db.user_topic_progressions if db is not None else None
        logger.info("✅ Telemetry Features initialized with Phase 4 enhancements")
    
    async def compute_user_features(self, user_id: str, topic_id: Optional[str] = None) -> Dict:
        """
        Compute comprehensive feature vector for user
        
        Phase 4 Enhancement: Uses PracticeSession telemetry data with:
        - Independence score and dependencies
        - Explanation quality
        - Solve time and retry patterns
        
        Args:
            user_id: User ID to compute features for
            topic_id: Optional topic ID for specific topic features
            
        Returns:
            Feature dictionary with all computed metrics
        """
        try:
            features = self._default_features()
            
            # Try to use PracticeSession data first (Phase 4)
            if self.practice_session_collection:
                practice_features = await self._compute_practice_session_features(
                    user_id,
                    topic_id
                )
                features.update(practice_features)
            
            # Fall back to legacy submission data if needed
            if not features.get("attempt_count") and self.submission_collection:
                legacy_features = await self._compute_legacy_submission_features(user_id)
                features.update(legacy_features)
            
            logger.info(f"🔧 Features computed for {user_id}: attempt_count={features['attempt_count']}, independence={features.get('independence_score', 1.0):.2f}")
            
            return features
        
        except Exception as e:
            logger.error(f"❌ Error computing features: {str(e)}")
            return self._default_features()
    
    async def _compute_practice_session_features(self, user_id: str, topic_id: Optional[str] = None) -> Dict:
        """
        Phase 4 Enhancement: Extract features from PracticeSession telemetry
        
        Returns features:
        - attempt_count, success_rate
        - avg_solve_time, solve_time_trend
        - independence_score, hint_dependency, voice_dependency, retry_dependency
        - explanation_quality
        - consistency, engagement
        """
        try:
            query = {"userId": user_id}
            if topic_id:
                query["topicId"] = topic_id
            
            sessions = await self.practice_session_collection.find(query).to_list(None)
            
            if not sessions:
                return {}
            
            attempt_count = len(sessions)
            success_count = sum(1 for s in sessions if s.get("submissionResult", {}).get("verdict") == "accepted")
            success_rate = success_count / attempt_count if attempt_count > 0 else 0
            
            # Telemetry extraction
            telemetry_data = [s.get("telemetry", {}) for s in sessions]
            
            # Solve time metrics
            solve_times = [t.get("solve_time", 0) for t in telemetry_data if t.get("solve_time")]
            avg_solve_time = float(np.mean(solve_times)) if solve_times else 0
            solve_time_std = float(np.std(solve_times)) if len(solve_times) > 1 else 0
            
            # Retry metrics
            retry_counts = [t.get("retry_count", 0) for t in telemetry_data]
            avg_retries = float(np.mean(retry_counts)) if retry_counts else 0
            
            # Independence & dependency metrics
            dependency_scores = [s.get("dependencyScore", {}) for s in sessions]
            independence_scores = [d.get("independenceScore", 1.0) for d in dependency_scores]
            hint_dependencies = [d.get("hintDependency", 0.0) for d in dependency_scores]
            voice_dependencies = [d.get("voiceDependency", 0.0) for d in dependency_scores]
            retry_dependencies = [d.get("retryDependency", 0.0) for d in dependency_scores]
            
            avg_independence = float(np.mean(independence_scores)) if independence_scores else 1.0
            avg_hint_dependency = float(np.mean(hint_dependencies)) if hint_dependencies else 0.0
            avg_voice_dependency = float(np.mean(voice_dependencies)) if voice_dependencies else 0.0
            avg_retry_dependency = float(np.mean(retry_dependencies)) if retry_dependencies else 0.0
            
            # Explanation quality
            explanation_scores = [s.get("explanationScore", {}).get("explanation_quality_score", 0.5) for s in sessions]
            avg_explanation_quality = float(np.mean(explanation_scores)) if explanation_scores else 0.5
            
            # Consistency metrics (recent 5 vs overall)
            recent_sessions = sessions[-5:] if len(sessions) > 5 else sessions
            recent_success = sum(1 for s in recent_sessions if s.get("submissionResult", {}).get("verdict") == "accepted")
            consistency = recent_success / len(recent_sessions) if recent_sessions else 0
            
            # Hint usage metrics
            hint_data = [s.get("hints", []) for s in sessions]
            total_hints = sum(len(h) for h in hint_data)
            avg_hints = total_hints / attempt_count if attempt_count > 0 else 0
            max_hint_level = max((max((h.get("level", 0) for h in hints), default=0) for hints in hint_data), default=0)
            
            # Voice usage
            voice_transcripts = [s.get("voice_transcript") for s in sessions if s.get("voice_transcript")]
            voice_usage_ratio = len(voice_transcripts) / attempt_count if attempt_count > 0 else 0
            
            return {
                "attempt_count": attempt_count,
                "success_rate": success_rate,
                "avg_solve_time": avg_solve_time,
                "solve_time_std": solve_time_std,
                "avg_retries": avg_retries,
                "avg_hints_used": avg_hints,
                "max_hint_level": max_hint_level,
                "avg_independence_score": avg_independence,
                "hint_dependency": avg_hint_dependency,
                "voice_dependency": avg_voice_dependency,
                "retry_dependency": avg_retry_dependency,
                "explanation_quality": avg_explanation_quality,
                "voice_usage_ratio": voice_usage_ratio,
                "consistency_score": consistency,
                "engagement": min(1.0, attempt_count / 100.0),
            }
        
        except Exception as e:
            logger.error(f"❌ Error computing practice session features: {str(e)}")
            return {}
    
    async def _compute_legacy_submission_features(self, user_id: str) -> Dict:
        """
        Fallback: Extract features from legacy submission collection
        
        Maintains backward compatibility with existing submission data
        """
        try:
            submissions = await self.submission_collection.find(
                {"userId": user_id}
            ).to_list(None)
            
            if not submissions:
                return {}
            
            attempt_count = len(submissions)
            success_count = sum(1 for s in submissions if s.get("isCorrect"))
            success_rate = success_count / attempt_count if attempt_count > 0 else 0
            
            solve_times = [s.get("solveTime", 0) for s in submissions if s.get("solveTime")]
            avg_solve_time = sum(solve_times) / len(solve_times) if solve_times else 0
            
            hint_count = sum(s.get("hintsUsed", 0) for s in submissions)
            avg_hints = hint_count / attempt_count if attempt_count > 0 else 0
            
            difficulties = [s.get("difficulty", 1) for s in submissions]
            max_difficulty = max(difficulties) if difficulties else 1
            
            recent_submissions = submissions[-10:]
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
            logger.error(f"❌ Error computing legacy submission features: {str(e)}")
            return {}
    
    def _default_features(self) -> Dict:
        """Return default feature vector with Phase 4 enhancements"""
        return {
            "attempt_count": 0,
            "success_rate": 0.5,
            "avg_solve_time": 0,
            "solve_time_std": 0,
            "avg_retries": 0,
            "avg_hints_used": 0,
            "max_hint_level": 0,
            "max_difficulty_attempted": 1,
            "avg_independence_score": 1.0,
            "hint_dependency": 0.0,
            "voice_dependency": 0.0,
            "retry_dependency": 0.0,
            "explanation_quality": 0.5,
            "voice_usage_ratio": 0.0,
            "consistency_score": 0.5,
            "engagement": 0.0,
        }
