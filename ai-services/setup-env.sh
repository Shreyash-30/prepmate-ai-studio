#!/bin/bash
# ============================================================================
# AI Services Environment Cleanup and Setup Script (Linux/Mac)
# ============================================================================

echo ""
echo "🧹 STEP 1: Cleaning Python Cache and Environment"
echo "============================================================================"

# Remove Python cache
echo "Removing __pycache__ directories..."
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null

echo "✅ Cache cleaned"
echo ""

echo "🐍 STEP 2: Upgrading pip, setuptools, wheel"
echo "============================================================================"
python3 -m pip install --upgrade pip setuptools wheel
if [ $? -ne 0 ]; then
    echo "❌ Failed to upgrade pip"
    exit 1
fi
echo "✅ pip upgraded"
echo ""

echo "📦 STEP 3: Installing Dependencies from requirements.txt"
echo "============================================================================"
pip install --no-cache-dir -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

echo "✅ STEP 4: Verifying Installation"
echo "============================================================================"
python3 -c "import fastapi; import uvicorn; import motor; import google.generativeai; import dotenv; print('✅ All core modules imported successfully')"
if [ $? -ne 0 ]; then
    echo "❌ Module import failed"
    exit 1
fi
echo ""

echo "🎉 Environment setup complete!"
echo ""
echo "To start the AI service, run:"
echo "  python3 main.py"
echo "  OR"
echo "  uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
