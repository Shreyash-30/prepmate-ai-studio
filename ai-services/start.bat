@echo off
REM ============================================================================
REM AI Services Startup Script with Automatic Setup
REM ============================================================================
REM This script:
REM 1. Checks and sets up Python environment if needed
REM 2. Validates all dependencies
REM 3. Starts the FastAPI server
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════════════╗
echo ║                     PREPMATE AI SERVICES STARTUP                       ║
echo ╚════════════════════════════════════════════════════════════════════════╝
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Python not found in PATH
    echo Please install Python 3.8+ or add it to your PATH
    pause
    exit /b 1
)

echo ✅ Python found
python --version

REM Check if setup.py has been run
echo.
echo Validating environment...
python -c "import fastapi; import motor; print('✅ Dependencies found')" >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  Missing dependencies detected. Running setup...
    echo.
    python setup.py
    if errorlevel 1 (
        echo ❌ Setup failed
        pause
        exit /b 1
    )
) else (
    echo ✅ All dependencies ready
)

echo.
echo ════════════════════════════════════════════════════════════════════════
echo 🚀 Starting AI Services...
echo ════════════════════════════════════════════════════════════════════════
echo.

REM Start the FastAPI application
python main.py

REM Fallback to uvicorn if main.py fails
if errorlevel 1 (
    echo.
    echo ⚠️  main.py startup failed, trying uvicorn directly...
    uvicorn main:app --host 0.0.0.0 --port 8000
)

pause
