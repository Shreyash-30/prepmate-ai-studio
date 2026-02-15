"""
AI Services Deployment Guide and Quick Start

QUICK START:
==========

1. Install Python 3.11+
2. Copy .env.example to .env and add your GEMINI_API_KEY
3. Install dependencies:
   pip install -r requirements.txt

4. Run the server:
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

5. Access the API documentation:
   http://localhost:8000/docs


ENVIRONMENT SETUP:
=================

Required Environment Variables:
- GEMINI_API_KEY: Your Google Gemini API key (required)
- MONGO_URI: MongoDB connection string (optional, defaults to localhost)
- PORT: Server port (default: 8000)
- ENV: Environment (development/production)
- ALLOWED_ORIGINS: CORS allowed origins (comma-separated)


DEPLOYMENT OPTIONS:
===================

Option 1: Docker Deployment
---------------------------
# Build
docker build -t prepmate-ai-services .

# Run
docker run -p 8000:8000 \\
  -e GEMINI_API_KEY=your_key \\
  -e MONGO_URI=mongodb://mongo:27017/prepmate_ai \\
  prepmate-ai-services


Option 2: Heroku Deployment
---------------------------
# Create Procfile with:
web: uvicorn main:app --host 0.0.0.0 --port $PORT

# Deploy:
git push heroku main


Option 3: AWS Lambda (with API Gateway)
---------------------------------------
Use serverless framework or AWS SAM with FastAPI


Option 4: Google Cloud Run
-------------------------
gcloud run deploy prepmate-ai-services \\
  --source . \\
  --platform managed \\
  --region us-central1 \\
  --set-env-vars GEMINI_API_KEY=your_key


MONGODB SETUP:
=============

Local MongoDB:
  mongod --version
  mongod  # Start server
  mongo   # Connect to shell

MongoDB Atlas (Cloud):
  1. Create account at mongodb.com/cloud/atlas
  2. Create cluster
  3. Get connection string
  4. Set MONGO_URI environment variable


API ENDPOINTS:
=============

Mentor Services:
  POST   /ai/mentor/chat - Chat with AI mentor
  GET    /ai/mentor/conversation/{id} - Get conversation details
  GET    /ai/mentor/conversations/{user_id} - Get user conversations
  DELETE /ai/mentor/conversation/{id} - Delete conversation

Practice Review Services:
  POST /ai/practice/review - Review submitted code
  GET  /ai/practice/reviews/{user_id} - Get review history
  POST /ai/practice/compare - Compare two solutions
  POST /ai/practice/optimizations - Get optimization suggestions

Interview Services:
  POST /ai/interview/simulate - Simulate technical interview
  GET  /ai/interview/session/{id} - Get interview session
  GET  /ai/interview/history/{user_id} - Get interview history
  GET  /ai/interview/progress/{user_id} - Get interview progress

Learning Services:
  POST /ai/learning/generate - Generate learning content
  GET  /ai/learning/summary/{topic} - Get quick topic summary
  GET  /ai/learning/explain/{concept} - Explain a concept

Health:
  GET  /ai/health - Check service health


NODE.JS INTEGRATION:
===================

# Install AI service client
npm install axios

# Create utility function in Node backend

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function callAIService(endpoint, data) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      timeout: 60000,
    });
    
    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`AI Service failed (${endpoint}):`, error);
    throw error;
  }
}

# Example usage:
const mentorResponse = await callAIService('/ai/mentor/chat', {
  userId: 'user123',
  topic: 'Arrays',
  userMessage: 'How do I implement quick sort?',
});


MONITORING AND LOGGING:
=====================

The application logs to console in development mode.
In production, configure:
- Log files
- Cloud logging (Google Cloud Logging, CloudWatch, etc.)
- APM (Application Performance Monitoring)


PERFORMANCE TIPS:
================

1. Use Redis for caching Gemini responses
2. Implement request queuing for high traffic
3. Use conversation history limits (default: 20 messages)
4. Cache learning content by topic and difficulty
5. Monitor API rate limits for Gemini


SECURITY CONSIDERATIONS:
=======================

1. Never commit .env files with API keys
2. Use HTTPS in production
3. Implement request validation with Pydantic
4. Add authentication middleware if needed
5. Rate limit API endpoints
6. Validate user inputs
7. Use CORS only for trusted origins
8. Keep dependencies updated


TROUBLESHOOTING:
===============

Issue: "GEMINI_API_KEY not set"
Solution: Ensure .env file has GEMINI_API_KEY=your_actual_key

Issue: MongoDB connection error
Solution: 
  - Verify MongoDB is running
  - Check MONGO_URI format
  - Check network connectivity

Issue: Timeout errors
Solution:
  - Increase timeout in requests
  - Check Gemini API status
  - Reduce model output token limit

Issue: CORS errors
Solution:
  - Add frontend URL to ALLOWED_ORIGINS
  - Check that frontend sends proper headers


TESTING:
=======

Run test suite:
  python test_llm_services.py

Unit tests (create tests/test_*.py):
  pytest tests/

Load testing:
  pip install locust
  locust -f locustfile.py


UPDATING DEPENDENCIES:
====================

Check for updates:
  pip list --outdated

Update all:
  pip install --upgrade -r requirements.txt

Update specific package:
  pip install --upgrade google-generativeai
"""

def get_quick_start_commands():
    """Quick start commands for different scenarios"""
    return {
        "local_development": [
            "python -m venv venv",
            "source venv/bin/activate  # or venv\\Scripts\\activate on Windows",
            "pip install -r requirements.txt",
            "cp .env.example .env",
            "# Edit .env and add GEMINI_API_KEY",
            "python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload",
        ],
        "docker": [
            "# Create Dockerfile in project root",
            "docker build -t prepmate-ai-services .",
            "docker run -p 8000:8000 -e GEMINI_API_KEY=your_key prepmate-ai-services",
        ],
        "production": [
            "pip install -r requirements.txt",
            "gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000",
        ],
    }


def get_docker_configurations():
    """Example Docker configurations"""
    return {
        "Dockerfile": """
FROM python:3.11-slim

WORKDIR /app

RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
""",
        "docker-compose.yml": """
version: '3.8'

services:
  ai-services:
    build: .
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - MONGO_URI=mongodb://mongo:27017/prepmate_ai
      - ENV=production
    depends_on:
      - mongo

  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
""",
    }
