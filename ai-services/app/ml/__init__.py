"""
ML Intelligence Layer
Production-grade ML/AI services for interview preparation platform
"""
from .mastery_engine import MasteryEngine
from .retention_model import RetentionModel
from .weakness_detection import WeaknessDetection
from .adaptive_planner import AdaptivePlanner
from .readiness_model import ReadinessModel
from .simulator import PreparationSimulator
from .telemetry_features import TelemetryFeatures
from .model_registry import ModelRegistry

__all__ = [
    "MasteryEngine",
    "RetentionModel",
    "WeaknessDetection",
    "AdaptivePlanner",
    "ReadinessModel",
    "PreparationSimulator",
    "TelemetryFeatures",
    "ModelRegistry",
]

# Global instances (initialized at startup)
mastery_engine = None
retention_model = None
weakness_detector = None
adaptive_planner = None
readiness_model = None
preparation_simulator = None
telemetry_features = None
model_registry = None


async def initialize_ml_services(db):
    """Initialize all ML services at FastAPI startup"""
    global mastery_engine, retention_model, weakness_detector, adaptive_planner
    global readiness_model, preparation_simulator, telemetry_features, model_registry

    model_registry = ModelRegistry()
    await model_registry.initialize()

    telemetry_features = TelemetryFeatures(db)
    mastery_engine = MasteryEngine(db)
    retention_model = RetentionModel(db)
    weakness_detector = WeaknessDetection(db, mastery_engine)
    adaptive_planner = AdaptivePlanner(db, mastery_engine, weakness_detector)
    readiness_model = ReadinessModel(db, model_registry)
    preparation_simulator = PreparationSimulator(
        mastery_engine, adaptive_planner, readiness_model
    )


def get_mastery_engine():
    """Get initialized mastery engine"""
    if mastery_engine is None:
        raise RuntimeError("ML services not initialized")
    return mastery_engine


def get_retention_model():
    """Get initialized retention model"""
    if retention_model is None:
        raise RuntimeError("ML services not initialized")
    return retention_model


def get_weakness_detector():
    """Get initialized weakness detector"""
    if weakness_detector is None:
        raise RuntimeError("ML services not initialized")
    return weakness_detector


def get_adaptive_planner():
    """Get initialized adaptive planner"""
    if adaptive_planner is None:
        raise RuntimeError("ML services not initialized")
    return adaptive_planner


def get_readiness_model():
    """Get initialized readiness model"""
    if readiness_model is None:
        raise RuntimeError("ML services not initialized")
    return readiness_model


def get_simulator():
    """Get initialized preparation simulator"""
    if preparation_simulator is None:
        raise RuntimeError("ML services not initialized")
    return preparation_simulator
