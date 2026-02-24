"""
ML Job Workers - Async Job Processing
Processes BullMQ jobs for mastery updates, retention analysis, weakness detection, and readiness prediction.

This module handles all async ML job processing that runs after practice submissions.
Jobs are enqueued from practiceSessionService.submitPractice() and processed here.
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class MLJobWorkers:
    """Processes async ML jobs from job queue"""
    
    def __init__(self, db: AsyncIOMotorDatabase, services: Dict[str, Any]):
        """
        Initialize job workers
        
        Args:
            db: AsyncIO MongoDB client
            services: Dict of ML services {
                'mastery_engine': MasteryEngine,
                'retention_model': RetentionModel,
                'weakness_detection': WeaknessDetection,
                'readiness_model': ReadinessModel,
                'telemetry_features': TelemetryFeatures,
            }
        """
        self.db = db
        self.services = services
        self.practice_session_col = db.practice_sessions
        self.user_topic_progression_col = db.user_topic_progressions
        self.ml_job_log_col = db.ml_job_logs
        
        logger.info("✅ ML Job Workers initialized")
    
    async def process_mastery_update(self, session_id: str, user_id: str, topic_id: str, metadata: Dict) -> Dict:
        """
        Process mastery update job
        
        Calculates effective learning using:
        - Base mastery probability from BKT model
        - Independence score penalty (hint_dependency + voice_dependency + retry_dependency)
        - Verdict (accepted/wrong_answer) as primary signal
        
        Formula:
        P_LEARN_EFFECTIVE = P_LEARN * (1 - hint_dependency) * (1 - voice_ratio) * (1 - retry_penalty)
        
        Or simplified:
        effective_learning = base_learning * independenceScore
        """
        try:
            logger.info(f"📊 Processing mastery update for session {session_id}")
            
            # Get practice session
            session = await self.practice_session_col.find_one({"_id": session_id})
            if not session:
                logger.error(f"Session {session_id} not found")
                raise ValueError(f"Session {session_id} not found")
            
            # Get user topic progression
            progression = await self.user_topic_progression_col.find_one(
                {"userId": user_id, "topicId": topic_id}
            )
            
            if not progression:
                progression = {
                    "userId": user_id,
                    "topicId": topic_id,
                    "masteryScore": 0.5,
                    "attemptCount": 0,
                    "correctCount": 0,
                    "lastAttemptDate": None,
                    "independenceScore": 1.0,
                    "hintDependency": 0.0,
                    "voiceDependency": 0.0,
                    "retryDependency": 0.0,
                }
            
            # Calculate BKT update
            verdict = metadata.get("verdict", "wrong_answer")
            correct = verdict == "accepted"
            passed_tests = metadata.get("passedTests", 0)
            total_tests = metadata.get("totalTests", 1)
            
            # Difficulty factor based on test passage
            test_ratio = passed_tests / total_tests if total_tests > 0 else 0
            difficulty_factor = 0.5 + (test_ratio * 0.5)  # 0.5-1.0
            
            # Get independence score from session
            independence_score = session.get("dependencyScore", {}).get("independenceScore", 1.0)
            hint_dependency = session.get("dependencyScore", {}).get("hintDependency", 0.0)
            voice_dependency = session.get("dependencyScore", {}).get("voiceDependency", 0.0)
            retry_dependency = session.get("dependencyScore", {}).get("retryDependency", 0.0)
            
            # Base learning rate from BKT
            mastery_engine = self.services.get("mastery_engine")
            if mastery_engine:
                base_mastery, confidence = mastery_engine.bkt.update(
                    prior=progression["masteryScore"],
                    correct=correct,
                    difficulty_factor=difficulty_factor,
                    hints_used=len(session.get("hints", [])),
                )
            else:
                # Fallback calculation
                if correct:
                    base_mastery = progression["masteryScore"] + (1 - progression["masteryScore"]) * 0.15
                else:
                    base_mastery = progression["masteryScore"] * 0.95
                confidence = 0.5
            
            # Apply independence score penalty
            effective_learning = base_mastery * independence_score
            
            # Clamp to valid range
            effective_learning = max(0.0, min(1.0, effective_learning))
            
            # Update progression
            progression["masteryScore"] = effective_learning
            progression["attemptCount"] = progression.get("attemptCount", 0) + 1
            if correct:
                progression["correctCount"] = progression.get("correctCount", 0) + 1
            progression["lastAttemptDate"] = datetime.utcnow()
            progression["independenceScore"] = independence_score
            progression["hintDependency"] = hint_dependency
            progression["voiceDependency"] = voice_dependency
            progression["retryDependency"] = retry_dependency
            progression["confidenceScore"] = confidence
            progression["successRate"] = progression["correctCount"] / progression["attemptCount"]
            
            # Save progression
            await self.user_topic_progression_col.update_one(
                {"userId": user_id, "topicId": topic_id},
                {"$set": progression},
                upsert=True,
            )
            
            logger.info(f"✅ Mastery updated: {effective_learning:.3f} (independence: {independence_score:.2f})")
            
            return {
                "status": "success",
                "mastery_score": effective_learning,
                "independence_score": independence_score,
                "confidence": confidence,
            }
        
        except Exception as e:
            logger.error(f"❌ Error in mastery update: {str(e)}")
            raise
    
    async def process_retention_update(self, session_id: str, user_id: str, topic_id: str, metadata: Dict) -> Dict:
        """
        Process retention update job
        
        Updates spaced repetition schedule using exponential forgetting curve.
        Schedules next review based on mastery level and prior attempts.
        """
        try:
            logger.info(f"📚 Processing retention update for session {session_id}")
            
            session = await self.practice_session_col.find_one({"_id": session_id})
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            progression = await self.user_topic_progression_col.find_one(
                {"userId": user_id, "topicId": topic_id}
            )
            
            if not progression:
                progression = {"userId": user_id, "topicId": topic_id}
            
            # Retention model from services
            retention_model = self.services.get("retention_model")
            
            last_review = progression.get("lastAttemptDate", datetime.utcnow())
            mastery = progression.get("masteryScore", 0.5)
            attempt_count = progression.get("attemptCount", 0)
            
            # Calculate days until next review
            if retention_model:
                next_review_days = retention_model.calculate_next_review_interval(
                    mastery=mastery,
                    attempt_number=attempt_count,
                )
            else:
                # Fallback: SM-2 algorithm approximation
                # Easy: 10 days, Good: 5 days, Hard: 1 day
                if mastery > 0.8:
                    next_review_days = 10
                elif mastery > 0.6:
                    next_review_days = 5
                else:
                    next_review_days = 1
            
            next_review_date = datetime.utcnow() + timedelta(days=next_review_days)
            
            # Update progression
            progression["nextReviewDate"] = next_review_date
            progression["reviewIntervalDays"] = next_review_days
            progression["retentionStrength"] = mastery
            
            await self.user_topic_progression_col.update_one(
                {"userId": user_id, "topicId": topic_id},
                {"$set": progression},
                upsert=True,
            )
            
            logger.info(f"✅ Retention updated: next review in {next_review_days} days")
            
            return {
                "status": "success",
                "next_review_date": next_review_date.isoformat(),
                "days_until_review": next_review_days,
            }
        
        except Exception as e:
            logger.error(f"❌ Error in retention update: {str(e)}")
            raise
    
    async def process_weakness_analysis(self, session_id: str, user_id: str, topic_id: str, metadata: Dict) -> Dict:
        """
        Process weakness analysis job
        
        Identifies patterns of weak performance and signals for focused intervention.
        Updates weak signal tracking for targeted learning recommendations.
        """
        try:
            logger.info(f"🔍 Processing weakness analysis for session {session_id}")
            
            session = await self.practice_session_col.find_one({"_id": session_id})
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            # Get weakness detection service
            weakness_detection = self.services.get("weakness_detection")
            
            progression = await self.user_topic_progression_col.find_one(
                {"userId": user_id, "topicId": topic_id}
            )
            
            if not progression:
                logger.warning(f"No progression for {user_id} / {topic_id}")
                return {"status": "skipped", "reason": "no_progression"}
            
            # Calculate weakness signals
            mastery = progression.get("masteryScore", 0.5)
            success_rate = progression.get("successRate", 0.5)
            attempt_count = progression.get("attemptCount", 1)
            
            # Mastery gap detection
            mastery_gap = max(0.0, 0.6 - mastery)  # Target mastery is 0.6
            
            # Retention risk (higher if not reviewed recently)
            last_attempt = progression.get("lastAttemptDate", datetime.utcnow())
            days_since_attempt = (datetime.utcnow() - last_attempt).days
            retention_risk = min(1.0, days_since_attempt / 14.0)  # 0-1 over 14 days
            
            # Performance variance (detect inconsistency)
            independence_score = progression.get("independenceScore", 1.0)
            performance_variance = 1.0 - independence_score  # High variance = low independence
            
            # Aggregate risk score
            risk_score = (
                mastery_gap * 0.4 +
                retention_risk * 0.3 +
                performance_variance * 0.3
            ) * 100  # Convert to 0-100 scale
            
            # Log weakness signal
            if weakness_detection:
                risk_analysis = await weakness_detection.analyze_user_weaknesses(user_id)
            else:
                risk_analysis = None
            
            logger.info(f"✅ Weakness analysis: risk_score={risk_score:.1f}, mastery_gap={mastery_gap:.2f}")
            
            return {
                "status": "success",
                "risk_score": risk_score,
                "mastery_gap": mastery_gap,
                "retention_risk": retention_risk,
                "gap_signals": {
                    "mastery_gap": mastery_gap > 0.1,
                    "retention_decay": retention_risk > 0.3,
                    "inconsistency": performance_variance > 0.3,
                },
            }
        
        except Exception as e:
            logger.error(f"❌ Error in weakness analysis: {str(e)}")
            raise
    
    async def process_readiness_prediction(self, session_id: str, user_id: str, topic_id: str, metadata: Dict) -> Dict:
        """
        Process readiness prediction job
        
        Updates interview readiness score based on:
        - Overall mastery across topics
        - Consistency and stability
        - Explanation quality
        - Mock interview performance
        - Time spent in preparation
        """
        try:
            logger.info(f"🎯 Processing readiness prediction for session {session_id}")
            
            session = await self.practice_session_col.find_one({"_id": session_id})
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            # Get readiness model service
            readiness_model = self.services.get("readiness_model")
            
            # Get explanation quality score from session
            explanation_score = session.get("explanationScore", {})
            explanation_quality = explanation_score.get("explanation_quality_score", 0.5)
            
            # Get telemetry features
            telemetry = session.get("telemetry", {})
            
            # Aggregate user statistics
            all_progressions = await self.user_topic_progression_col.find(
                {"userId": user_id}
            ).to_list(None)
            
            if not all_progressions:
                all_progressions = [{"masteryScore": 0.5}]
            
            avg_mastery = sum(p.get("masteryScore", 0.5) for p in all_progressions) / len(all_progressions)
            
            # Build feature vector for readiness model
            features = {
                "avg_mastery": avg_mastery,
                "explanation_quality": explanation_quality,
                "independence_score": telemetry.get("independence_score", 1.0),
                "solve_time": telemetry.get("solve_time", 0),
                "problem_count": len(all_progressions),
                "consistency": sum(p.get("successRate", 0.5) for p in all_progressions) / len(all_progressions),
            }
            
            # Predict readiness
            if readiness_model:
                readiness_pred = await readiness_model.predict_readiness(user_id, features)
                readiness_score = readiness_pred.readiness_score
                confidence = readiness_pred.confidence_score
            else:
                # Fallback readiness calculation
                readiness_score = (
                    avg_mastery * 0.4 +
                    explanation_quality * 0.3 +
                    features["independence_score"] * 0.2 +
                    min(1.0, features["problem_count"] / 100) * 0.1
                ) * 100
                confidence = 0.5
            
            logger.info(f"✅ Readiness predicted: {readiness_score:.1f}/100 (confidence: {confidence:.2f})")
            
            return {
                "status": "success",
                "readiness_score": readiness_score,
                "confidence": confidence,
                "explanation_quality": explanation_quality,
                "avg_mastery": avg_mastery,
            }
        
        except Exception as e:
            logger.error(f"❌ Error in readiness prediction: {str(e)}")
            raise


async def start_job_worker(job_queue_service, db, ml_services):
    """
    Start listening for jobs from BullMQ
    
    Processes jobs from 4 queues:
    - masteryUpdate
    - retentionUpdate
    - weaknessAnalysis
    - readinessPrediction
    """
    workers = MLJobWorkers(db, ml_services)
    
    logger.info("🚀 ML Job Workers starting...")
    
    try:
        # Start workers for each queue
        # This would integrate with BullMQ workers in production
        # For now, just log that workers are ready
        logger.info("✅ ML Job Workers ready")
        
    except Exception as e:
        logger.error(f"❌ Error starting workers: {str(e)}")
        raise


__all__ = ['MLJobWorkers', 'start_job_worker']
