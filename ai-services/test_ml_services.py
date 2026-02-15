"""
ML Intelligence Layer - Test Suite
Integration tests for all ML services
"""
import pytest
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def db():
    """Create test database"""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.test_prepmate_ai
    yield db
    await db.command("dropDatabase")


@pytest.fixture
async def mastery_engine(db):
    """Initialize mastery engine"""
    from app.ml.mastery_engine import MasteryEngine
    engine = MasteryEngine(db)
    await engine.initialize_indexes()
    return engine


@pytest.fixture
async def retention_model(db):
    """Initialize retention model"""
    from app.ml.retention_model import RetentionModel
    model = RetentionModel(db)
    await model.initialize_indexes()
    return model


# ============================================================================
# MASTERY ENGINE TESTS
# ============================================================================

async def test_mastery_update(mastery_engine):
    """Test mastery estimation"""
    from app.ml.mastery_engine import MasteryUpdateRequest
    
    request = MasteryUpdateRequest(
        user_id="test_user",
        topic_id="binary_trees",
        attempts=[
            {"correct": True, "difficulty": 1, "hints_used": 0, "time_factor": 1.0},
            {"correct": True, "difficulty": 1, "hints_used": 0, "time_factor": 1.0},
            {"correct": False, "difficulty": 2, "hints_used": 1, "time_factor": 1.5},
        ],
    )
    
    result = await mastery_engine.update_mastery(request)
    
    assert result.mastery_probability > 0.1
    assert result.confidence_score > 0
    assert result.improvement_trend in ["improving", "stable", "declining"]


async def test_mastery_profile(mastery_engine):
    """Test mastery profile retrieval"""
    from app.ml.mastery_engine import MasteryUpdateRequest
    
    # Add some mastery data
    for topic in ["binary_trees", "dynamic_programming", "graphs"]:
        request = MasteryUpdateRequest(
            user_id="test_user",
            topic_id=topic,
            attempts=[{"correct": True, "difficulty": 1, "hints_used": 0, "time_factor": 1.0}],
        )
        await mastery_engine.update_mastery(request)
    
    profile = await mastery_engine.get_user_mastery_profile("test_user")
    
    assert profile["user_id"] == "test_user"
    assert len(profile["topics"]) == 3
    assert profile["average_mastery"] > 0


# ============================================================================
# RETENTION MODEL TESTS
# ============================================================================

async def test_retention_update(retention_model):
    """Test retention update"""
    from app.ml.retention_model import RetentionUpdateRequest
    
    request = RetentionUpdateRequest(
        user_id="test_user",
        topic_id="binary_trees",
        is_successful_revision=True,
        time_since_last_revision_hours=48,
    )
    
    result = await retention_model.update_retention(request)
    
    assert result.retention_probability > 0
    assert result.stability_score > 0
    assert result.days_until_revision > 0
    assert result.urgency_level in ["critical", "high", "medium", "low"]


async def test_revision_queue(retention_model):
    """Test revision queue retrieval"""
    from app.ml.retention_model import RetentionUpdateRequest
    
    # Add some revision data
    for i in range(3):
        request = RetentionUpdateRequest(
            user_id="test_user",
            topic_id=f"topic_{i}",
            is_successful_revision=True,
            time_since_last_revision_hours=24 * i,
        )
        await retention_model.update_retention(request)
    
    queue = await retention_model.get_revision_queue("test_user", limit=5)
    
    assert len(queue) > 0
    assert "topic_id" in queue[0]
    assert "retention" in queue[0]


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

async def test_ml_services_workflow(mastery_engine, retention_model):
    """Test complete ML workflow"""
    from app.ml.mastery_engine import MasteryUpdateRequest
    from app.ml.retention_model import RetentionUpdateRequest
    
    user_id = "workflow_test_user"
    topic_id = "binary_trees"
    
    # Step 1: Update mastery
    mastery_req = MasteryUpdateRequest(
        user_id=user_id,
        topic_id=topic_id,
        attempts=[
            {"correct": True, "difficulty": 1, "hints_used": 0, "time_factor": 1.0},
            {"correct": True, "difficulty": 2, "hints_used": 0, "time_factor": 1.2},
        ],
    )
    mastery_result = await mastery_engine.update_mastery(mastery_req)
    
    assert mastery_result.mastery_probability > 0
    
    # Step 2: Update retention
    retention_req = RetentionUpdateRequest(
        user_id=user_id,
        topic_id=topic_id,
        is_successful_revision=True,
        time_since_last_revision_hours=48,
    )
    retention_result = await retention_model.update_retention(retention_req)
    
    assert retention_result.retention_probability > 0
    
    # Verify data persistence
    mastery_doc = await mastery_engine.get_mastery(user_id, topic_id)
    assert mastery_doc is not None
    assert mastery_doc["mastery_probability"] > 0


# ============================================================================
# FEATURE COMPUTATION TESTS
# ============================================================================

async def test_feature_engineering(db):
    """Test telemetry feature computation"""
    from app.ml.telemetry_features import TelemetryFeatures
    
    features = TelemetryFeatures(db)
    user_features = await features.compute_user_features("nonexistent_user")
    
    assert "attempt_count" in user_features
    assert "success_rate" in user_features
    assert user_features["attempt_count"] == 0


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
