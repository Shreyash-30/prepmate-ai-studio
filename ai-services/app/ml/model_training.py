"""
Model Training Infrastructure
Training pipeline for readiness prediction and other ML models.

Run: python -m app.ml.model_training
"""
import logging
import asyncio
import numpy as np
from motor.motor_asyncio import AsyncIOMotorClient
from app.ml.model_registry import ModelRegistry

logger = logging.getLogger(__name__)


async def generate_synthetic_training_data(n_samples: int = 100):
    """
    Generate synthetic training data for model development/testing
    In production, use actual user preparation data
    """
    # Features: [avg_mastery, stability, consistency, difficulty_prog, mock_score, completion, days_prep]
    X = np.random.randn(n_samples, 7)
    X = np.clip(X * 0.3 + 0.5, 0, 1)  # Scale to 0-1
    
    # Target: readiness probability (0-1)
    # Correlation with features
    y = (
        0.25 * X[:, 0] +  # mastery
        0.15 * X[:, 1] +  # stability
        0.15 * X[:, 2] +  # consistency
        0.15 * X[:, 3] +  # difficulty
        0.15 * X[:, 4] +  # mock_score
        0.10 * X[:, 5] +  # completion
        0.05 * X[:, 6] +  # days
        np.random.randn(n_samples) * 0.1  # noise
    )
    y = np.clip(y, 0, 1)  # Clip to 0-1
    
    return X, y


async def train_readiness_model():
    """Train XGBoost readiness prediction model"""
    try:
        import xgboost as xgb
        
        logger.info("🔄 Training readiness model...")
        
        # Generate training data
        X_train, y_train = await generate_synthetic_training_data(100)
        
        # Create and train model
        model = xgb.XGBRegressor(
            n_estimators=50,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            objective='reg:squarederror',
        )
        
        model.fit(X_train, y_train)
        
        # Save model
        registry = ModelRegistry()
        await registry.save_model(
            "readiness_xgboost",
            model,
            {
                "model_type": "xgboost",
                "task": "readiness_prediction",
                "n_features": 7,
                "training_samples": 100,
                "feature_names": [
                    "avg_mastery",
                    "stability_score",
                    "consistency",
                    "difficulty_progression",
                    "mock_interview_score",
                    "completion_rate",
                    "days_prepared",
                ],
            },
        )
        
        logger.info("✅ Readiness model training complete")
        
        # Evaluate on test data
        X_test, y_test = await generate_synthetic_training_data(20)
        y_pred = model.predict(X_test)
        
        mse = np.mean((y_pred - y_test) ** 2)
        rmse = np.sqrt(mse)
        
        logger.info(f"📊 Model RMSE: {rmse:.4f}")
        logger.info(f"📊 Feature importance: {dict(zip(['feat_' + str(i) for i in range(7)], model.feature_importances_))}")
        
        return True
    
    except ImportError:
        logger.warning("XGBoost not available, skipping model training")
        return False


async def train_all_models():
    """Train all ML models"""
    logger.info("🚀 Starting model training pipeline...")
    
    try:
        await train_readiness_model()
        logger.info("✨ All models trained successfully")
    
    except Exception as e:
        logger.error(f"❌ Training failed: {e}")


async def main():
    """Main training entry point"""
    logging.basicConfig(level=logging.INFO)
    await train_all_models()


if __name__ == "__main__":
    asyncio.run(main())
