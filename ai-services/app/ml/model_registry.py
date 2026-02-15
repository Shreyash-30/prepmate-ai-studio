"""
Model Registry - Model Versioning and Persistence System
Manages model versions, training, and inference model loading.
"""
import logging
import os
import pickle
from datetime import datetime
from typing import Optional, Any

logger = logging.getLogger(__name__)

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False


class ModelRegistry:
    """Central model registry and versioning system"""
    
    MODEL_DIR = "./models"
    
    def __init__(self):
        self.models = {}
        self.model_metadata = {}
        logger.info("Model Registry initialized")
    
    async def initialize(self):
        """Initialize model registry"""
        os.makedirs(self.MODEL_DIR, exist_ok=True)
        await self.load_all_models()
    
    async def load_model(self, model_name: str) -> Optional[Any]:
        """Load model from disk"""
        try:
            model_path = os.path.join(self.MODEL_DIR, f"{model_name}.pkl")
            
            if os.path.exists(model_path):
                with open(model_path, "rb") as f:
                    model = pickle.load(f)
                self.models[model_name] = model
                logger.info(f"✅ Loaded model: {model_name}")
                return model
            else:
                logger.warning(f"Model not found: {model_name}")
                return None
        
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            return None
    
    async def load_all_models(self):
        """Load all available models"""
        model_names = ["readiness_xgboost", "mastery_calibration", "retention_tuning"]
        
        for name in model_names:
            await self.load_model(name)
    
    async def save_model(self, model_name: str, model: Any, metadata: dict = None):
        """Save model to disk with metadata"""
        try:
            model_path = os.path.join(self.MODEL_DIR, f"{model_name}.pkl")
            
            with open(model_path, "wb") as f:
                pickle.dump(model, f)
            
            self.models[model_name] = model
            self.model_metadata[model_name] = {
                "saved_at": datetime.utcnow().isoformat(),
                "type": type(model).__name__,
                **(metadata or {}),
            }
            
            logger.info(f"✅ Saved model: {model_name}")
        
        except Exception as e:
            logger.error(f"Error saving model {model_name}: {e}")
    
    def get_model(self, model_name: str) -> Optional[Any]:
        """Get loaded model"""
        return self.models.get(model_name)
    
    def get_model_info(self, model_name: str) -> dict:
        """Get model metadata"""
        return self.model_metadata.get(model_name, {})
    
    async def create_dummy_models(self):
        """Create and save dummy models for testing"""
        try:
            # Dummy readiness model
            if XGBOOST_AVAILABLE:
                dummy_model = xgb.XGBRegressor(
                    n_estimators=10,
                    max_depth=3,
                    learning_rate=0.1,
                )
                # Create dummy training data
                import numpy as np
                X_dummy = np.random.randn(100, 7)
                y_dummy = np.random.rand(100)
                dummy_model.fit(X_dummy, y_dummy)
                await self.save_model(
                    "readiness_xgboost",
                    dummy_model,
                    {"model_type": "xgboost", "task": "readiness_prediction"},
                )
            
            logger.info("✅ Created dummy models for testing")
        
        except Exception as e:
            logger.warning(f"Could not create dummy models: {e}")
