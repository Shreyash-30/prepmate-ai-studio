"""
Preparation Simulator - Strategy Simulation Engine
Simulates preparation scenarios and projects learning curves.
"""
import logging
import numpy as np
from typing import Dict, List
from datetime import datetime, timedelta
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class SimulationScenario(BaseModel):
    """Simulation scenario parameters"""
    daily_study_hours: float
    focus_topics: List[str]
    timeline_days: int
    consistency: str = "high"  # high, medium, low


class SimulationResult(BaseModel):
    """Simulation results"""
    scenario: SimulationScenario
    projected_readiness_trajectory: List[float]
    projected_mastery_curves: Dict[str, List[float]]
    completion_forecast_date: str
    confidence_score: float


class PreparationSimulator:
    """Preparation strategy simulation service"""
    
    def __init__(self, mastery_engine, adaptive_planner, readiness_model):
        self.mastery_engine = mastery_engine
        self.adaptive_planner = adaptive_planner
        self.readiness_model = readiness_model
        logger.info("Preparation Simulator initialized")
    
    async def run_simulation(
        self, user_id: str, scenario: SimulationScenario
    ) -> SimulationResult:
        """
        Run preparation scenario simulation
        
        Projects learning trajectories based on study patterns
        """
        try:
            mastery_profile = await self.mastery_engine.get_user_mastery_profile(user_id)
            
            # Simulate learning progression
            readiness_trajectory = []
            mastery_curves = {t["topic_id"]: [] for t in mastery_profile.get("topics", [])}
            
            # Learning rate adjustments
            consistency_factor = {"high": 1.2, "medium": 1.0, "low": 0.7}.get(
                scenario.consistency, 1.0
            )
            study_factor = scenario.daily_study_hours / 2.0  # 2 hours is baseline
            
            start_topics = set(scenario.focus_topics)
            current_date = datetime.utcnow()
            
            for day in range(scenario.timeline_days):
                daily_readiness = 0.0
                topic_count = 0
                
                for topic in mastery_profile.get("topics", []):
                    topic_id = topic["topic_id"]
                    current_mastery = topic.get("mastery", 0.1)
                    
                    # Apply learning based on focus and study time
                    if topic_id in start_topics:
                        daily_improvement = 0.02 * study_factor * consistency_factor
                    else:
                        daily_improvement = 0.005 * consistency_factor  # Passive
                    
                    new_mastery = min(1.0, current_mastery + daily_improvement)
                    mastery_curves[topic_id].append(new_mastery)
                    
                    daily_readiness += new_mastery
                    topic_count += 1
                
                if topic_count > 0:
                    readiness_trajectory.append(daily_readiness / topic_count * 100.0)
            
            # Estimate completion date (reach 80% readiness)
            completion_date = current_date
            for idx, readiness in enumerate(readiness_trajectory):
                if readiness >= 80.0:
                    completion_date = current_date + timedelta(days=idx)
                    break
            
            # Confidence based on scenario realism
            confidence = min(0.95, 0.7 + (consistency_factor * 0.2))
            
            return SimulationResult(
                scenario=scenario,
                projected_readiness_trajectory=readiness_trajectory,
                projected_mastery_curves=mastery_curves,
                completion_forecast_date=completion_date.isoformat(),
                confidence_score=confidence,
            )
        
        except Exception as e:
            logger.error(f"Error running simulation: {str(e)}")
            raise
