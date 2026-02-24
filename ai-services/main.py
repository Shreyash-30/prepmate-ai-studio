"""
FastAPI Application Setup
Initializes all LLM services and configures the application

Environment Setup Flow:
1. Check Python version
2. Load .env file
3. Import FastAPI and dependencies
4. Initialize services (LLM, ML, MongoDB)
5. Start server on configured port
"""
import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure Python 3.8+
if sys.version_info < (3, 8):
    print("❌ ERROR: Python 3.8+ required")
    sys.exit(1)

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    load_dotenv(env_path, override=True)
except ImportError:
    print("⚠️  WARNING: python-dotenv not found, using system environment")

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

try:
    from app.llm import (
        initialize_gemini,
        router,
        set_mentor_service,
        set_practice_review_service,
        set_interview_service,
        set_learning_service,
        set_voice_service,
        MentorService,
        PracticeReviewService,
        InterviewService,
        LearningService,
        VoiceInteractionService,
        voice_router,
    )
    from app.llm.advanced_routers import router as advanced_router
    try:
        from app.ml import initialize_ml_services
        from app.ml.routers import router as ml_router
        ml_available = True
    except ImportError as e:
        print(f"⚠️  WARNING: ML services not available: {e}")
        async def initialize_ml_services(db):
            """Fallback stub for ML services"""
            print("  ML services disabled - running with LLM-only mode")
        ml_router = None
        ml_available = False
except ImportError as e:
    print(f"❌ ERROR: Failed to import core LLM modules: {e}")
    print("\nTroubleshooting:")
    print("1. Run: pip install -r requirements.txt")
    print("2. Check requirements.txt is complete")
    print("3. Ensure you're in the ai-services directory")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global database instance
db: AsyncIOMotorDatabase = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager
    Handles startup and shutdown events
    """
    # Startup
    logger.info("🚀 Starting AI Services...")

    try:
        # Initialize Gemini (non-fatal - allows startup even without API key)
        await initialize_gemini()

        # Initialize MongoDB connection
        mongo_uri = os.getenv(
            "MONGO_URI",
            "mongodb://localhost:27017/prepmate-ai-studio"
        )
        client = AsyncIOMotorClient(mongo_uri)
        
        # Extract database name from URI or use default
        from urllib.parse import urlparse
        parsed_uri = urlparse(mongo_uri)
        db_name = parsed_uri.path.lstrip('/') or 'prepmate-ai-studio'
        db = client[db_name]

        # Check MongoDB connection
        await db.command("ping")
        logger.info("✅ MongoDB connected")

        # Initialize services
        mentor_service = MentorService(db)
        await mentor_service.initialize_indexes()
        set_mentor_service(mentor_service)
        logger.info("✅ Mentor service initialized")

        practice_review_service = PracticeReviewService(db)
        await practice_review_service.initialize_indexes()
        set_practice_review_service(practice_review_service)
        logger.info("✅ Practice review service initialized")

        interview_service = InterviewService(db)
        await interview_service.initialize_indexes()
        set_interview_service(interview_service)
        logger.info("✅ Interview service initialized")

        learning_service = LearningService(db)
        await learning_service.initialize_indexes()
        set_learning_service(learning_service)
        logger.info("✅ Learning service initialized")

        voice_service = VoiceInteractionService(db)
        set_voice_service(voice_service)
        logger.info("✅ Voice interaction service initialized")

        # Initialize ML Intelligence Layer
        await initialize_ml_services(db)
        logger.info("✅ ML Intelligence Layer initialized")

        logger.info("✨ All AI Services ready!")

    except Exception as e:
        logger.error(f"❌ Critical startup error: {str(e)}")
        raise

    yield

    # Shutdown
    logger.info("🛑 Shutting down AI Services...")
    if client:
        client.close()
    logger.info("✅ Shutdown complete")


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""

    app = FastAPI(
        title="Prepmate AI Services",
        description="Gemini-powered AI services for interview preparation platform",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Configure CORS
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(router)
    app.include_router(advanced_router)
    app.include_router(voice_router)
    if ml_available and ml_router:
        app.include_router(ml_router)

    # Root endpoint
    @app.get("/")
    async def root():
        return {
            "message": "Prepmate AI Services",
            "status": "running",
            "docs": "/docs",
            "health": "/ai/health",
        }

    return app


# Create application instance
app = create_app()

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("AI_SERVICE_PORT", os.getenv("PORT", "8001")))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("ENV", "development") == "development",
    )
