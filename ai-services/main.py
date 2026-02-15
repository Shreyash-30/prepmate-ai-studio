"""
FastAPI Application Setup
Initializes all LLM services and configures the application
"""
import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.llm import (
    initialize_gemini,
    router,
    set_mentor_service,
    set_practice_review_service,
    set_interview_service,
    set_learning_service,
    MentorService,
    PracticeReviewService,
    InterviewService,
    LearningService,
)
from app.ml import initialize_ml_services
from app.ml.routers import router as ml_router

# Setup logging
logging.basicConfig(level=logging.INFO)
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
            "mongodb://localhost:27017/prepmate_ai"
        )
        client = AsyncIOMotorClient(mongo_uri)
        db = client.prepmate_ai

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

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENV", "development") == "development",
    )
