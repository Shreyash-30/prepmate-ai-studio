"""
ML Intelligence Layer - FastAPI Router
REST endpoints for all ML intelligence services
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel

from app.ml import (
    get_mastery_engine,
    get_retention_model,
    get_weakness_detector,
    get_adaptive_planner,
    get_readiness_model,
    get_simulator,
)
from app.ml.mastery_engine import MasteryUpdateRequest
from app.ml.retention_model import RetentionUpdateRequest
from app.ml.weakness_detection import WeaknessAnalysisRequest
from app.ml.adaptive_planner import AdaptivePlanRequest
from app.ml.readiness_model import ReadinessPredictionRequest
from app.ml.simulator import SimulationScenario

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/ml", tags=["ML Intelligence"])


# ============================================================================
# MASTERY ENGINE ENDPOINTS
# ============================================================================

@router.post("/mastery/update")
async def update_mastery(
    request: MasteryUpdateRequest = Body(...),
    engine=Depends(get_mastery_engine),
):
    """
    Update skill mastery based on user attempts
    
    POST /ai/ml/mastery/update
    {
        "user_id": "user123",
        "topic_id": "binary_trees",
        "attempts": [
            {"correct": true, "difficulty": 1, "hints_used": 0, "time_ms": 15000}
        ]
    }
    """
    try:
        result = await engine.update_mastery(request)
        return {
            "success": True,
            "data": result.dict(),
        }
    except Exception as e:
        logger.error(f"Mastery update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mastery/profile/{user_id}")
async def get_mastery_profile(
    user_id: str,
    engine=Depends(get_mastery_engine),
):
    """Get user's mastery profile across all topics"""
    try:
        profile = await engine.get_user_mastery_profile(user_id)
        return {
            "success": True,
            "data": profile,
        }
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# RETENTION MODEL ENDPOINTS
# ============================================================================

@router.post("/retention/update")
async def update_retention(
    request: RetentionUpdateRequest = Body(...),
    model=Depends(get_retention_model),
):
    """
    Update retention estimate after revision
    
    POST /ai/ml/retention/update
    {
        "user_id": "user123",
        "topic_id": "binary_trees",
        "is_successful_revision": true,
        "time_since_last_revision_hours": 48.5
    }
    """
    try:
        result = await model.update_retention(request)
        return {
            "success": True,
            "data": result.dict(),
        }
    except Exception as e:
        logger.error(f"Retention update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retention/queue/{user_id}")
async def get_revision_queue(
    user_id: str,
    limit: int = 10,
    model=Depends(get_retention_model),
):
    """Get topics needing revision (ordered by urgency)"""
    try:
        queue = await model.get_revision_queue(user_id, limit)
        return {
            "success": True,
            "data": queue,
        }
    except Exception as e:
        logger.error(f"Queue retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WEAKNESS DETECTION ENDPOINTS
# ============================================================================

@router.post("/weakness/analyze")
async def analyze_weaknesses(
    request: WeaknessAnalysisRequest = Body(...),
    detector=Depends(get_weakness_detector),
):
    """
    Analyze weak areas and identify at-risk topics
    
    POST /ai/ml/weakness/analyze
    {
        "user_id": "user123",
        "include_contest_data": true
    }
    """
    try:
        analysis = await detector.analyze_weaknesses(request)
        return {
            "success": True,
            "data": analysis.dict(),
        }
    except Exception as e:
        logger.error(f"Weakness analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ADAPTIVE PLANNER ENDPOINTS
# ============================================================================

@router.post("/planner/generate")
async def generate_adaptive_plan(
    request: AdaptivePlanRequest = Body(...),
    planner=Depends(get_adaptive_planner),
):
    """
    Generate personalized adaptive preparation plan
    
    POST /ai/ml/planner/generate
    {
        "user_id": "user123",
        "daily_study_minutes": 120,
        "target_company": "Google",
        "preparation_days": 30
    }
    """
    try:
        plan = await planner.generate_adaptive_plan(request)
        return {
            "success": True,
            "data": plan.dict(),
        }
    except Exception as e:
        logger.error(f"Plan generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# READINESS PREDICTION ENDPOINTS
# ============================================================================

@router.post("/readiness/predict")
async def predict_readiness(
    request: ReadinessPredictionRequest = Body(...),
    model=Depends(get_readiness_model),
):
    """
    Predict interview readiness score and probability
    
    POST /ai/ml/readiness/predict
    {
        "user_id": "user123",
        "target_company": "Google"
    }
    """
    try:
        prediction = await model.predict_readiness(request)
        return {
            "success": True,
            "data": prediction.dict(),
        }
    except Exception as e:
        logger.error(f"Readiness prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SIMULATOR ENDPOINTS
# ============================================================================

@router.post("/simulator/run")
async def run_simulation(
    user_id: str = Body(..., embed=True),
    scenario: SimulationScenario = Body(..., embed=True),
    simulator=Depends(get_simulator),
):
    """
    Run preparation scenario simulation
    
    POST /ai/ml/simulator/run
    {
        "user_id": "user123",
        "scenario": {
            "daily_study_hours": 2.5,
            "focus_topics": ["binary_trees", "dp"],
            "timeline_days": 30,
            "consistency": "high"
        }
    }
    """
    try:
        result = await simulator.run_simulation(user_id, scenario)
        return {
            "success": True,
            "data": result.dict(),
        }
    except Exception as e:
        logger.error(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def ml_health():
    """ML Intelligence Layer health check"""
    return {
        "status": "operational",
        "services": [
            "mastery_engine",
            "retention_model",
            "weakness_detection",
            "adaptive_planner",
            "readiness_model",
            "simulator",
        ],
    }
