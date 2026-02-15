"""
Readiness Model - Interview Readiness Prediction Engine
XGBoost-based prediction model for interview preparation readiness.
"""
import logging
import pickle
import numpy as np
from typing import Dict, Optional, Tuple, List
from datetime import datetime
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    logger.warning("XGBoost not available, using fallback model")


class ReadinessPredictionRequest(BaseModel):
    """Request for readiness prediction"""
    user_id: str
    target_company: Optional[str] = None


class ReadinessPrediction(BaseModel):
    """Readiness prediction output"""
    readiness_score: float  # 0-100
    confidence_score: float  # 0-1
    probability_passing: float  # Estimated prob of passing (0-1)
    time_to_readiness_days: int
    estimated_readiness_date: str
    primary_gaps: List[str]
    explainability: Dict


class ReadinessModel:
    """Interview readiness prediction service"""
    
    # Feature importance from training
    FEATURE_WEIGHTS = {
        "avg_mastery": 0.25,
        "stability_score": 0.15,
        "consistency": 0.15,
        "difficulty_progression": 0.15,
        "mock_interview_score": 0.15,
        "completion_rate": 0.10,
        "days_prepared": 0.05,
    }
    
    def __init__(self, db: AsyncIOMotorDatabase, model_registry):
        self.db = db
        self.model_registry = model_registry
        self.readiness_collection = db.readiness_score if db is not None else None
        self.model = None
        logger.info("Readiness Model initialized")
    
    async def initialize(self):
        """Initialize readiness model"""
        try:
            if self.model_registry:
                self.model = await self.model_registry.load_model("readiness_xgboost")
                if self.model:
                    logger.info("✅ XGBoost readiness model loaded")
                else:
                    logger.warning("No trained model found, using fallback LGR model")
        except Exception as e:
            logger.warning(f"Could not load model: {str(e)}, using fallback")
    
    async def initialize_indexes(self) -> None:
        """Initialize MongoDB indexes"""
        if self.readiness_collection is None:
            return
        
        try:
            await self.readiness_collection.create_index("userId")
            await self.readiness_collection.create_index("targetCompany")
            await self.readiness_collection.create_index([("userId", 1), ("targetCompany", 1)])
            logger.info("Readiness Model indexes created")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
    
    async def _extract_features(
        self, user_id: str, mastery_profile: Dict, retention_data: Dict
    ) -> np.ndarray:
        """
        Extract features for prediction
        
        Returns 7-dimensional feature vector
        """
        try:
            # Extract mastery features
            masteries = [t.get("mastery", 0) for t in mastery_profile.get("topics", [])]
            avg_mastery = float(np.mean(masteries)) if masteries else 0.0
            
            # Extract stability (revision schedule)
            stabilities = [
                t.get("stability", 3.0)
                for t in retention_data.get("topics", [])
            ]
            stability_score = float(np.mean(stabilities)) if stabilities else 0.0
            
            # Calculate consistency trend
            improving_count = sum(
                1
                for t in mastery_profile.get("topics", [])
                if t.get("trend") == "improving"
            )
            total_topics = len(masteries)
            consistency = improving_count / max(total_topics, 1)
            
            # Difficulty progression (assume linear scale 0-1)
            difficulty_progression = 0.5  # Placeholder, would track difficulty over time
            
            # Mock interview score (placeholder)
            mock_score = 0.5  # Would come from actual mock tests
            
            # Completion rate (topics with mastery > 0.6)
            completed = sum(1 for m in masteries if m > 0.6)
            completion_rate = completed / max(total_topics, 1)
            
            # Days prepared (placeholder, would come from user started_date)
            days_prepared = 30.0  # Placeholder
            
            features = np.array([
                avg_mastery,
                stability_score / 30.0,  # Normalize to 0-1
                consistency,
                difficulty_progression,
                mock_score,
                completion_rate,
                min(days_prepared / 60.0, 1.0),  # Normalize
            ], dtype=np.float32)
            
            return features
        
        except Exception as e:
            logger.error(f"Error extracting features: {str(e)}")
            # Return default features on error
            return np.array([0.5] * 7, dtype=np.float32)
    
    def _fallback_prediction(self, features: np.ndarray) -> Tuple[float, float]:
        """
        Fallback prediction using weighted feature combination when XGBoost unavailable
        
        Returns (readiness_score_0_to_100, confidence_0_to_1)
        """
        weights = np.array([
            0.25, 0.15, 0.15, 0.15, 0.15, 0.10, 0.05
        ])
        
        # Weighted combination
        weighted_score = float(np.dot(features, weights))
        
        # Apply logistic transformation for smoother curve
        readiness = 100.0 * (1.0 / (1.0 + np.exp(-10.0 * (weighted_score - 0.5))))
        
        # Confidence based on feature variance
        confidence = float(np.clip(1.0 - np.std(features) * 0.5, 0.3, 0.95))
        
        return float(readiness), float(confidence)
    
    async def predict_readiness(
        self, request: ReadinessPredictionRequest
    ) -> ReadinessPrediction:
        """
        Predict interview readiness for user
        
        Args:
            request: Prediction request
            
        Returns:
            Readiness prediction with explainability
        """
        try:
            # Get mastery profile
            mastery_profile = await self.db.collection.find_one(
                {"userId": request.user_id}
            ) if self.db else None
            
            if not mastery_profile:
                mastery_profile = {"topics": []}
            
            # Get retention snapshot
            retention_data = {"topics": []}
            if self.db and self.db.revision_schedule:
                retention_docs = await self.db.revision_schedule.find(
                    {"userId": request.user_id}
                ).to_list(None)
                retention_data = {"topics": retention_docs or []}
            
            # Extract features
            features = await self._extract_features(
                request.user_id, mastery_profile, retention_data
            )
            
            # Make prediction
            if self.model and XGBOOST_AVAILABLE:
                try:
                    features_batch = features.reshape(1, -1)
                    readiness_prob = float(self.model.predict(features_batch)[0])
                    readiness_score = readiness_prob * 100.0
                    confidence = 0.85  # XGBoost default confidence
                except Exception as e:
                    logger.warning(f"XGBoost prediction failed: {e}, using fallback")
                    readiness_score, confidence = self._fallback_prediction(features)
            else:
                readiness_score, confidence = self._fallback_prediction(features)
            
            # Estimate time to readiness (80 score)
            target_readiness = 80.0
            gap = max(0, target_readiness - readiness_score)
            # Assume 2 points per day improvement
            days_to_target = int(gap / 2.0)
            readiness_date = (datetime.utcnow() + timedelta(days=days_to_target)).isoformat()
            
            # Identify primary gaps
            topics_below_threshold = []
            if mastery_profile.get("topics"):
                for topic in mastery_profile["topics"]:
                    if topic.get("mastery", 0) < 0.6:
                        topics_below_threshold.append(topic["topic_id"])
            
            primary_gaps = topics_below_threshold[:3]
            
            # Calculate passing probability (logistic curve)
            passing_threshold = 0.7  # 70% is passing
            passing_prob = 1.0 / (1.0 + np.exp(-5.0 * (readiness_score / 100.0 - 0.5)))
            passing_prob = float(np.clip(passing_prob, 0.0, 1.0))
            
            # Build explainability
            explainability = {
                "model": "XGBoost Readiness Predictor" if self.model else "Fallback LGR Model",
                "confidence": confidence,
                "features_used": [
                    f"Average Mastery: {features[0]:.1%}",
                    f"Stability Score: {features[1]:.1%}",
                    f"Consistency: {features[2]:.0%}",
                    f"Difficulty Progression: {features[3]:.0%}",
                    f"Mock Test Score: {features[4]:.0%}",
                    f"Completion Rate: {features[5]:.0%}",
                    f"Preparation Days: {features[6]:.0f}",
                ],
                "gaps": primary_gaps,
                "improvement_areas": [
                    f"Increase mastery in: {', '.join(primary_gaps)}"
                    if primary_gaps
                    else "Maintain current progress"
                ],
            }
            
            # Store prediction
            if self.readiness_collection is not None:
                await self.readiness_collection.update_one(
                    {
                        "userId": request.user_id,
                        "targetCompany": request.target_company or "general",
                    },
                    {
                        "$set": {
                            "userId": request.user_id,
                            "targetCompany": request.target_company or "general",
                            "readinessScore": readiness_score,
                            "confidenceScore": confidence,
                            "passingProbability": passing_prob,
                            "predictedReadinessDate": readiness_date,
                            "predictionDate": datetime.utcnow(),
                        }
                    },
                    upsert=True,
                )
            
            return ReadinessPrediction(
                readiness_score=readiness_score,
                confidence_score=confidence,
                probability_passing=passing_prob,
                time_to_readiness_days=days_to_target,
                estimated_readiness_date=readiness_date,
                primary_gaps=primary_gaps,
                explainability=explainability,
            )
        
        except Exception as e:
            logger.error(f"Error predicting readiness: {str(e)}")
            raise
