"""
Configuration settings for AI Services
Loads environment variables from central .env file at project root
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load from root .env file (parent directory of ai-services)
root_dir = Path(__file__).parent.parent
root_env_path = root_dir / '.env'

if root_env_path.exists():
    load_dotenv(dotenv_path=root_env_path, override=True)
else:
    print(f"Warning: Root .env file not found at {root_env_path}")
    print("Using default environment variables or .env from current directory")


class Settings(BaseSettings):
    """Application settings from environment variables (sourced from root .env)"""

    # API Configuration
    app_name: str = os.getenv("VITE_APP_NAME", "PrepMate AI Services")
    app_version: str = os.getenv("VITE_APP_VERSION", "1.0.0")
    environment: str = os.getenv("NODE_ENV", "development")
    debug: bool = os.getenv("VITE_DEBUG_MODE", "false").lower() == "true"

    # Server Configuration
    host: str = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))

    # Gemini API Configuration
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = "gemini-2.5-flash"
    gemini_temperature: float = 0.4
    gemini_max_tokens: int = 2048

    # MongoDB Configuration
    mongo_uri: str = os.getenv(
        "MONGO_URI",
        "mongodb://localhost:27017/prepmate-ai"
    )
    mongo_db_name: str = "prepmate_ai"

    # CORS Configuration
    allowed_origins: list = [
        origin.strip() 
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5000").split(',')
    ]

    # Backend API Configuration
    backend_url: str = os.getenv("VITE_API_BASE_URL", "http://localhost:5000/api")

    # Logging Configuration
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    # LLM Service Configuration
    enable_mentor_service: bool = True
    enable_practice_review_service: bool = True
    enable_interview_service: bool = True
    enable_learning_service: bool = True

    # Conversation Memory Configuration
    max_conversation_history: int = 20  # Store last N messages
    conversation_ttl_hours: int = 24 * 30  # 30 days

    # Retry Configuration
    max_retries: int = 3
    retry_delay_seconds: int = 2
    request_timeout_seconds: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()


def validate_settings() -> bool:
    """Validate critical settings"""
    if not settings.gemini_api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is required"
        )
    return True
