#!/bin/bash
# Startup script for AI Services
# Usage: ./start-ai-services.sh

set -e

echo "🚀 Starting Prepmate AI Services..."

# Check if Python 3.11+ is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3.11+ is required but not installed."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python version: $PYTHON_VERSION"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    source venv/Scripts/activate
fi

echo "✅ Virtual environment activated"

# Install/upgrade dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Edit .env file and add your GEMINI_API_KEY"
    echo "Some configuration is required before starting the server."
fi

# Check if GEMINI_API_KEY is set
if ! grep -q "GEMINI_API_KEY=.*[^ ]" .env 2>/dev/null; then
    echo "❌ GEMINI_API_KEY is not set in .env file"
    echo "Please add your Google Gemini API key to .env file and try again"
    exit 1
fi

echo "✅ Dependencies installed"

# Start the server
echo "🌐 Starting FastAPI server..."
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

