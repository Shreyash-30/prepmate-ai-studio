@echo off
REM ============================================================
REM START-AI-SERVICES.BAT
REM Starts the Python FastAPI AI service on port 8001 (Windows)
REM Run from project root: scripts\start-ai-services.bat
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo 🚀 Starting PrepMate AI Services
echo ==========================================
echo.

REM Change to ai-services directory
cd /d ai-services
if !errorlevel! neq 0 (
    echo ❌ Failed to change to ai-services directory
    exit /b 1
)

REM Check if .env exists
if not exist .env (
    echo ⚠️  .env file not found in ai-services\. Creating from .env.example...
    if exist .env.example (
        copy .env.example .env
        echo ✅ .env created. Please update with your GEMINI_API_KEY
    ) else (
        echo ❌ Neither .env nor .env.example found!
        exit /b 1
    )
)

REM Check Python version
python --version >nul 2>&1
if !errorlevel! neq 0 (
    echo ❌ Python not found. Please install Python 3.8+
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python version: %PYTHON_VERSION%

REM Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing Python dependencies...
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt

if !errorlevel! neq 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo ✅ Dependencies installed
echo.
echo Starting FastAPI server on port 8001...
echo.

REM Start the FastAPI service
set PYTHONUNBUFFERED=1
uvicorn main:app --host 0.0.0.0 --port 8001 --log-level info

endlocal
