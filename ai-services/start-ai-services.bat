@echo off
REM Startup script for AI Services (Windows)
REM Usage: start-ai-services.bat

echo 🚀 Starting Prepmate AI Services...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 3.11+ is required but not installed.
    exit /b 1
)

echo ✅ Python is installed

REM Check if virtual environment exists
if not exist "venv\" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat
echo ✅ Virtual environment activated

REM Install/upgrade dependencies
echo 📥 Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Check for .env file
if not exist ".env" (
    echo ⚠️  .env file not found. Creating from .env.example...
    copy .env.example .env
    echo 📝 Edit .env file and add your GEMINI_API_KEY
)

REM Start the server
echo 🌐 Starting FastAPI server...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

