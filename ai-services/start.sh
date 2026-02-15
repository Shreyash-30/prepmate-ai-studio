#!/bin/bash
# ============================================================================
# AI Services Startup Script with Automatic Setup (Linux/Mac)
# ============================================================================
# This script:
# 1. Checks and sets up Python environment if needed
# 2. Validates all dependencies
# 3. Starts the FastAPI server
# ============================================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                     PREPMATE AI SERVICES STARTUP                       ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ ERROR: Python3 not found in PATH"
    echo "Please install Python 3.8+ or add it to your PATH"
    exit 1
fi

echo "✅ Python found"
python3 --version

# Check if setup has been run
echo ""
echo "Validating environment..."
if ! python3 -c "import fastapi; import motor" 2>/dev/null; then
    echo ""
    echo "⚠️  Missing dependencies detected. Running setup..."
    echo ""
    python3 setup.py || {
        echo "❌ Setup failed"
        exit 1
    }
else
    echo "✅ All dependencies ready"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "🚀 Starting AI Services..."
echo "════════════════════════════════════════════════════════════════════════"
echo ""

# Start the FastAPI application
python3 main.py || {
    echo ""
    echo "⚠️  main.py startup failed, trying uvicorn directly..."
    uvicorn main:app --host 0.0.0.0 --port 8000
}
