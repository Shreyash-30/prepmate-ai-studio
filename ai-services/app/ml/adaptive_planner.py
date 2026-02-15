"""
Adaptive Planner - Intelligent Task Recommendation Engine
Optimizes preparation tasks based on mastery, weakness, and learning gain.
"""
import logging
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class AdaptivePlanRequest(BaseModel):
    """Request for adaptive plan generation"""
    user_id: str
    daily_study_minutes: int = 120
    target_company: Optional[str] = None
    preparation_days: int = 30


class TaskRecommendation(BaseModel):
    """Individual task recommendation"""
    task_id: str
    topic_id: str
    task_type: str  # "practice", "study", "revision", "mock_interview"
    priority: float  # 0-1
    estimated_time_minutes: int
    difficulty: str  # "easy", "medium", "hard"
    rationale: str
    expected_learning_gain: float  # 0-1


class AdaptivePlan(BaseModel):
    """Adaptive preparation plan"""
    user_id: str
    plan_date: str
    total_study_minutes: int
    tasks_today: List[TaskRecommendation]
    weekly_focus: List[str]  # Top topics to focus on
    weekly_structure: Dict  # Day-by-day recommendations
    explainability: Dict


class AdaptivePlanner:
    """Intelligent adaptive planning service"""
    
    # Topic importance weights for interview prep
    TOPIC_IMPORTANCE = {
        "data_structures": 0.95,
        "algorithms": 0.93,
        "system_design": 0.85,
        "databases": 0.70,
        "oop": 0.65,
        "networking": 0.50,
    }
    
    # Task time estimates (minutes)
    TASK_TIMES = {
        "practice": 45,
        "study": 30,
        "revision": 20,
        "mock_interview": 120,
    }
    
    def __init__(self, db: AsyncIOMotorDatabase, mastery_engine, weakness_detector):
        self.db = db
        self.mastery_engine = mastery_engine
        self.weakness_detector = weakness_detector
        self.task_collection = db.preparation_tasks if db is not None else None
        logger.info("Adaptive Planner initialized")
    
    async def initialize_indexes(self) -> None:
        """Initialize MongoDB indexes"""
        if self.task_collection is None:
            return
        
        try:
            await self.task_collection.create_index("userId")
            await self.task_collection.create_index([("userId", 1), ("scheduledDate", 1)])
            await self.task_collection.create_index("priority", direction=-1)
            logger.info("Adaptive Planner indexes created")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
    
    def _calculate_learning_gain(
        self,
        mastery: float,
        topic_importance: float,
        retention_level: float,
        difficulty_match: float,
    ) -> float:
        """
        Calculate expected learning gain for a task
        
        Formula: LG = (1 - mastery) × importance × learning_multiplier
        """
        mastery_gap = 1.0 - mastery
        
        # Learning multiplier based on retention and difficulty
        if retention_level < 0.5:
            # Revision needed, high gain potential
            learning_multiplier = 1.5
        elif difficulty_match > 0.7:
            # Well-matched difficulty, good learning
            learning_multiplier = 1.2
        else:
            # Normal learning rate
            learning_multiplier = 1.0
        
        learning_gain = mastery_gap * topic_importance * learning_multiplier
        return float(np.clip(learning_gain, 0.0, 1.0))
    
    def _calculate_task_priority(
        self,
        learning_gain: float,
        urgency: float,  # 0-1, 1 = most urgent
        mastery: float,
    ) -> float:
        """Calculate task priority score (0-1)"""
        # Combine learning gain and urgency
        priority = 0.6 * learning_gain + 0.4 * urgency
        
        # Boost priority if mastery is very low
        if mastery < 0.4:
            priority *= 1.3
        
        return float(np.clip(priority, 0.0, 1.0))
    
    async def generate_adaptive_plan(
        self, request: AdaptivePlanRequest
    ) -> AdaptivePlan:
        """
        Generate personalized adaptive preparation plan
        
        Args:
            request: Plan generation request
            
        Returns:
            Customized preparation plan
        """
        try:
            now = datetime.utcnow()
            
            # Get user mastery profile
            mastery_profile = await self.mastery_engine.get_user_mastery_profile(
                request.user_id
            )
            
            # Get weakness analysis
            weakness_analysis = await self.weakness_detector.analyze_weaknesses(
                {"user_id": request.user_id, "include_contest_data": True}
            )
            
            # Get retention data
            retention_map = {}
            if self.db and self.db.revision_schedule:
                retention_docs = await self.db.revision_schedule.find(
                    {"userId": request.user_id}
                ).to_list(None)
                retention_map = {
                    r["topicId"]: r.get("retention_probability", 0.5)
                    for r in retention_docs
                }
            
            # Build task candidates
            task_candidates = []
            
            for topic in mastery_profile.get("topics", []):
                topic_id = topic["topic_id"]
                mastery = topic.get("mastery", 0)
                importance = self.TOPIC_IMPORTANCE.get(topic_id, 0.6)
                retention = retention_map.get(topic_id, 0.5)
                
                # Determine urgency
                if topic_id in weakness_analysis.focus_areas:
                    urgency = 0.9
                elif mastery < 0.5:
                    urgency = 0.7
                elif retention < 0.5:
                    urgency = 0.6
                else:
                    urgency = 0.3
                
                # Determine task type based on state
                if mastery < 0.4:
                    task_type = "study"
                    difficulty = "easy"
                    difficulty_match = (1.0 - mastery) / 2.0
                elif mastery < 0.7:
                    task_type = "practice"
                    difficulty = "medium"
                    difficulty_match = 1.0 - abs(mastery - 0.7) / 0.3
                else:
                    task_type = "revision" if retention < 0.7 else "mock_interview"
                    difficulty = "hard"
                    difficulty_match = 1.0 - (1.0 - mastery) * 0.5
                
                # Calculate learning gain
                learning_gain = self._calculate_learning_gain(
                    mastery, importance, retention, difficulty_match
                )
                
                # Calculate priority
                priority = self._calculate_task_priority(learning_gain, urgency, mastery)
                
                # Estimate time
                time_minutes = self.TASK_TIMES.get(task_type, 45)
                
                task_candidates.append({
                    "topic_id": topic_id,
                    "task_type": task_type,
                    "difficulty": difficulty,
                    "priority": priority,
                    "learning_gain": learning_gain,
                    "time_minutes": time_minutes,
                    "mastery": mastery,
                    "importance": importance,
                })
            
            # Sort by priority
            task_candidates.sort(key=lambda x: x["priority"], reverse=True)
            
            # Select tasks for today based on available time
            tasks_today = []
            total_time = 0
            
            for idx, candidate in enumerate(task_candidates):
                if total_time + candidate["time_minutes"] <= request.daily_study_minutes:
                    total_time += candidate["time_minutes"]
                    
                    rationale = self._generate_rationale(candidate, weakness_analysis)
                    
                    tasks_today.append(
                        TaskRecommendation(
                            task_id=f"{request.user_id}_{candidate['topic_id']}_task",
                            topic_id=candidate["topic_id"],
                            task_type=candidate["task_type"],
                            priority=candidate["priority"],
                            estimated_time_minutes=candidate["time_minutes"],
                            difficulty=candidate["difficulty"],
                            rationale=rationale,
                            expected_learning_gain=candidate["learning_gain"],
                        )
                    )
            
            # Generate weekly structure
            weekly_structure = self._generate_weekly_structure(
                tasks_today, request.daily_study_minutes
            )
            
            # Build explainability
            explainability = {
                "strategy": "Bayesian mastery + retention-aware task sequencing",
                "optimization": "Expected Learning Gain with constraint satisfaction",
                "constraints": [
                    f"Daily study time: {request.daily_study_minutes} minutes",
                    f"Preparation period: {request.preparation_days} days",
                ],
                "focus_topics": weakness_analysis.focus_areas,
                "total_tasks_generated": len(task_candidates),
                "tasks_scheduled_today": len(tasks_today),
            }
            
            # Store plan in database
            if self.task_collection is not None:
                for task in tasks_today:
                    await self.task_collection.insert_one({
                        "userId": request.user_id,
                        "taskId": task.task_id,
                        "topicId": task.topic_id,
                        "taskType": task.task_type,
                        "difficulty": task.difficulty,
                        "priority": task.priority,
                        "scheduledDate": now.date().isoformat(),
                        "estimatedTime": task.estimated_time_minutes,
                        "createdAt": now,
                    })
            
            return AdaptivePlan(
                user_id=request.user_id,
                plan_date=now.date().isoformat(),
                total_study_minutes=total_time,
                tasks_today=tasks_today,
                weekly_focus=weakness_analysis.focus_areas,
                weekly_structure=weekly_structure,
                explainability=explainability,
            )
        
        except Exception as e:
            logger.error(f"Error generating adaptive plan: {str(e)}")
            raise
    
    def _generate_rationale(self, candidate: Dict, weakness_analysis) -> str:
        """Generate human-readable rationale for task"""
        topic = candidate["topic_id"]
        mastery = candidate["mastery"]
        task_type = candidate["task_type"]
        
        if topic in weakness_analysis.focus_areas:
            return f"Priority weak area: {topic} at {mastery:.0%} mastery"
        elif mastery < 0.4:
            return f"Foundational learning: {topic} needs strengthening"
        elif mastery < 0.7:
            return f"Skill consolidation: Practice {topic} to reach proficiency"
        else:
            return f"Maintenance: {task_type} to sustain {topic} knowledge"
    
    def _generate_weekly_structure(
        self, tasks_today: List[TaskRecommendation], daily_minutes: int
    ) -> Dict:
        """Generate weekly structure recommendations"""
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        # Distribute tasks across week
        structure = {}
        for day in days:
            structure[day] = {
                "focus_count": 2,  # Number of focus areas
                "study_minutes": daily_minutes,
                "recommended_mix": ["practice", "revision", "mock_interview"],
            }
        
        return structure
