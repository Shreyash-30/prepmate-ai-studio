#!/bin/bash

# ============================================================
# START-AI-SERVICES.SH
# Starts the Python FastAPI AI service on port 8001
# Run from project root: ./scripts/start-ai-services.sh
# ============================================================

set -e

echo "=========================================="
echo "🚀 Starting PrepMate AI Services"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to ai-services directory
cd ai-services

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found in ai-services/. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env created. Please update with your GEMINI_API_KEY${NC}"
    else
        echo -e "${RED}❌ Neither .env nor .env.example found!${NC}"
        exit 1
    fi
fi

# Check Python version
echo "Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.8+${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✅ Python version: $PYTHON_VERSION${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/upgrade dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Start the FastAPI service
echo -e "\n${GREEN}Starting FastAPI server on port 8001...${NC}"
export PYTHONUNBUFFERED=1
uvicorn main:app --host 0.0.0.0 --port 8001 --log-level info

