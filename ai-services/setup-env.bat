@echo off
REM ============================================================================
REM AI Services Environment Cleanup and Setup Script
REM ============================================================================

echo.
echo 🧹 STEP 1: Cleaning Python Cache and Environment
echo ============================================================================

REM Remove Python cache
echo Removing __pycache__ directories...
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"

REM Remove .egg-info
echo Removing .egg-info directories...
for /d /r . %%d in (*.egg-info) do @if exist "%%d" rd /s /q "%%d"

REM Remove site-packages cache (optional - uncomment if needed)
REM echo Clearing pip cache...
REM pip cache purge

echo ✅ Cache cleaned
echo.

echo 🐍 STEP 2: Upgrading pip, setuptools, wheel
echo ============================================================================
python -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
    echo ❌ Failed to upgrade pip
    exit /b 1
)
echo ✅ pip upgraded
echo.

echo 📦 STEP 3: Installing Dependencies from requirements.txt
echo ============================================================================
pip install --no-cache-dir -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)
echo ✅ Dependencies installed
echo.

echo ✅ STEP 4: Verifying Installation
echo ============================================================================
python -c "import fastapi; import uvicorn; import motor; import google.generativeai; import dotenv; print('✅ All core modules imported successfully')"
if errorlevel 1 (
    echo ❌ Module import failed
    exit /b 1
)
echo.

echo 🎉 Environment setup complete!
echo.
echo To start the AI service, run:
echo   python main.py
echo   OR
echo   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
echo.
pause
