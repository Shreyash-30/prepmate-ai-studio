"""
Weakness Detection - Risk Scoring Engine
Identifies weak areas and high-risk topics for targeted intervention.
"""
import logging
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class WeaknessAnalysisRequest(BaseModel):
    """Request for weakness analysis"""
    user_id: str
    include_contest_data: bool = True


class TopicRisk(BaseModel):
    """Risk score for a topic"""
    topic_id: str
    risk_score: float  # 0-100
    mastery_gap: float  # below target
    retention_risk: float  # 0-1
    difficulty_gap: float  # performance vs expected
    signal_type: str  # "mastery_gap", "retention_decay", "performance_variance"
    recommendation: str


class WeaknessAnalysis(BaseModel):
    """Complete weakness analysis"""
    user_id: str
    weak_topics: List[TopicRisk]
    focus_areas: List[str]  # Top 3 topics needing focus
    intervention_priority_score: float  # 0-100
    explainability: Dict


class WeaknessDetection:
    """Weak area intelligence and risk detection service"""
    
    # Risk thresholds and weights
    MASTERY_THRESHOLD = 0.6  # Below this indicates knowledge gap
    RETENTION_THRESHOLD = 0.5  # Below this indicates decay risk
    DIFFICULTY_TARGET = 0.75  # Expected success rate
    
    # Risk weights for aggregation
    MASTERY_WEIGHT = 0.35
    RETENTION_WEIGHT = 0.25
    DIFFICULTY_WEIGHT = 0.25
    CONSISTENCY_WEIGHT = 0.15
    
    def __init__(self, db: AsyncIOMotorDatabase, mastery_engine):
        self.db = db
        self.mastery_engine = mastery_engine
        self.weak_signal_collection = db.weak_topic_signals if db is not None else None
        logger.info("Weakness Detection initialized")
    
    async def initialize_indexes(self) -> None:
        """Initialize MongoDB indexes"""
        if self.weak_signal_collection is None:
            return
        
        try:
            await self.weak_signal_collection.create_index("userId")
            await self.weak_signal_collection.create_index([("userId", 1), ("topicId", 1)], unique=True)
            await self.weak_signal_collection.create_index("riskScore", direction=-1)
            logger.info("Weakness Detection indexes created")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
    
    def _calculate_mastery_gap(self, mastery: float) -> float:
        """Calculate mastery gap (0-1)"""
        if mastery >= self.MASTERY_THRESHOLD:
            return 0.0
        # Normalize gap to 0-1 range
        gap = (self.MASTERY_THRESHOLD - mastery) / self.MASTERY_THRESHOLD
        return float(np.clip(gap, 0.0, 1.0))
    
    def _calculate_retention_risk(self, retention: float) -> float:
        """Calculate retention decay risk (0-1)"""
        if retention >= self.RETENTION_THRESHOLD:
            return 0.0
        # Exponential risk increase below threshold
        risk = 1.0 - np.exp(-(1.0 - retention) * 3.0)
        return float(np.clip(risk, 0.0, 1.0))
    
    def _calculate_difficulty_gap(self, success_rate: float) -> float:
        """Calculate performance vs difficulty mismatch"""
        gap = abs(success_rate - self.DIFFICULTY_TARGET) / self.DIFFICULTY_TARGET
        return float(np.clip(gap, 0.0, 1.0))
    
    def _determine_signal_type(
        self, mastery_gap: float, retention_risk: float, difficulty_gap: float
    ) -> str:
        """Determine primary weak signal type"""
        max_gap = max(mastery_gap, retention_risk, difficulty_gap)
        
        if max_gap == mastery_gap and mastery_gap > 0.3:
            return "mastery_gap"
        elif max_gap == retention_risk and retention_risk > 0.3:
            return "retention_decay"
        elif max_gap == difficulty_gap and difficulty_gap > 0.3:
            return "performance_variance"
        else:
            return "general_weakness"
    
    def _calculate_topic_risk_score(
        self,
        mastery_gap: float,
        retention_risk: float,
        difficulty_gap: float,
        consistency_score: float,
    ) -> float:
        """
        Calculate weighted risk score (0-100)
        
        Args:
            mastery_gap: 0-1
            retention_risk: 0-1
            difficulty_gap: 0-1
            consistency_score: 0-1 (1 = consistent)
            
        Returns:
            Risk score 0-100
        """
        # Consistency reduces overall risk (better is lower risk)
        consistency_factor = 1.0 - (consistency_score * 0.3)
        
        weighted_risk = (
            mastery_gap * self.MASTERY_WEIGHT
            + retention_risk * self.RETENTION_WEIGHT
            + difficulty_gap * self.DIFFICULTY_WEIGHT
            + (1.0 - consistency_score) * self.CONSISTENCY_WEIGHT
        )
        
        risk_score = weighted_risk * consistency_factor * 100.0
        return float(np.clip(risk_score, 0.0, 100.0))
    
    async def analyze_weaknesses(
        self, request: WeaknessAnalysisRequest
    ) -> WeaknessAnalysis:
        """
        Comprehensive weakness analysis for a user
        
        Args:
            request: Analysis request
            
        Returns:
            Complete weakness analysis with recommendations
        """
        try:
            # Get user's mastery profile
            mastery_profile = await self.mastery_engine.get_user_mastery_profile(
                request.user_id
            )
            
            # Get retention snapshot
            if self.db and self.db.revision_schedule:
                retention_docs = await self.db.revision_schedule.find(
                    {"userId": request.user_id}
                ).to_list(None)
                retention_map = {
                    r["topicId"]: r.get("retention_probability", 0.5)
                    for r in retention_docs
                }
            else:
                retention_map = {}
            
            # Calculate weak topics
            weak_topics = []
            risk_scores = []
            
            for topic in mastery_profile.get("topics", []):
                topic_id = topic["topic_id"]
                mastery = topic.get("mastery", 0)
                retention = retention_map.get(topic_id, 0.5)
                consistency = topic.get("trend", "stable")
                
                # Convert trend to consistency score
                consistency_score = {"improving": 0.8, "stable": 0.6, "declining": 0.3}.get(
                    consistency, 0.5
                )
                
                # Calculate gaps
                mastery_gap = self._calculate_mastery_gap(mastery)
                retention_risk = self._calculate_retention_risk(retention)
                difficulty_gap = self._calculate_difficulty_gap(mastery)  # Use mastery as proxy
                
                # Calculate risk score
                risk_score = self._calculate_topic_risk_score(
                    mastery_gap, retention_risk, difficulty_gap, consistency_score
                )
                
                # Determine signal type
                signal_type = self._determine_signal_type(
                    mastery_gap, retention_risk, difficulty_gap
                )
                
                # Build recommendation
                if signal_type == "mastery_gap":
                    recommendation = f"Increase practice: current {mastery:.0%} vs target {self.MASTERY_THRESHOLD:.0%}"
                elif signal_type == "retention_decay":
                    recommendation = f"Urgent review needed: retention at {retention:.0%}"
                elif signal_type == "performance_variance":
                    recommendation = "Mixed performance, focus on fundamentals"
                else:
                    recommendation = "Targeted practice recommended"
                
                if risk_score > 20:  # Only include meaningful weak areas
                    weak_topics.append(
                        TopicRisk(
                            topic_id=topic_id,
                            risk_score=risk_score,
                            mastery_gap=mastery_gap,
                            retention_risk=retention_risk,
                            difficulty_gap=difficulty_gap,
                            signal_type=signal_type,
                            recommendation=recommendation,
                        )
                    )
                    risk_scores.append(risk_score)
            
            # Sort by risk score
            weak_topics.sort(key=lambda x: x.risk_score, reverse=True)
            
            # Get top focus areas
            focus_areas = [t.topic_id for t in weak_topics[:3]]
            
            # Calculate overall intervention priority
            intervention_priority = (
                float(np.mean(risk_scores)) if risk_scores else 0.0
            )
            
            # Build explainability
            explainability = {
                "analysis_date": datetime.utcnow().isoformat(),
                "weak_topics_count": len(weak_topics),
                "top_signals": [
                    t.signal_type for t in weak_topics[:3]
                ],
                "metrics": {
                    "average_risk": float(np.mean(risk_scores)) if risk_scores else 0.0,
                    "max_risk": float(np.max(risk_scores)) if risk_scores else 0.0,
                    "topics_at_risk": len([r for r in risk_scores if r > 40]),
                },
            }
            
            # Store signals in database
            if self.weak_signal_collection is not None:
                for topic_risk in weak_topics:
                    await self.weak_signal_collection.update_one(
                        {
                            "userId": request.user_id,
                            "topicId": topic_risk.topic_id,
                        },
                        {
                            "$set": {
                                "userId": request.user_id,
                                "topicId": topic_risk.topic_id,
                                "riskScore": topic_risk.risk_score,
                                "masteryGap": topic_risk.mastery_gap,
                                "retentionRisk": topic_risk.retention_risk,
                                "difficultyGap": topic_risk.difficulty_gap,
                                "signalType": topic_risk.signal_type,
                                "detectedAt": datetime.utcnow(),
                            }
                        },
                        upsert=True,
                    )
            
            return WeaknessAnalysis(
                user_id=request.user_id,
                weak_topics=weak_topics,
                focus_areas=focus_areas,
                intervention_priority_score=intervention_priority,
                explainability=explainability,
            )
        
        except Exception as e:
            logger.error(f"Error analyzing weaknesses: {str(e)}")
            raise
    
    async def get_weak_topic_signals(self, user_id: str) -> List[Dict]:
        """Get detected weak topic signals"""
        if self.weak_signal_collection is None:
            return []
        
        try:
            signals = await self.weak_signal_collection.find(
                {"userId": user_id}
            ).sort("riskScore", -1).to_list(None)
            
            return [
                {
                    "topic_id": s["topicId"],
                    "risk_score": s.get("riskScore", 0),
                    "signal_type": s.get("signalType", "unknown"),
                    "detected_at": s.get("detectedAt", "").isoformat()
                    if hasattr(s.get("detectedAt"), "isoformat")
                    else s.get("detectedAt"),
                }
                for s in signals
            ]
        except Exception as e:
            logger.error(f"Error retrieving weak signals: {str(e)}")
            return []
