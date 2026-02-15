"""
API Specification for Prepmate AI Services

This file documents all available endpoints and their behavior.
"""

# MENTOR CHAT SERVICES
MENTOR_ENDPOINTS = {
    "POST /ai/mentor/chat": {
        "description": "Chat with AI mentor about a topic",
        "request": {
            "userId": "string (required)",
            "topic": "string (required)",
            "userMessage": "string (required)",
            "preparationContext": "string (optional)",
            "masteryScore": "float 0-1 (optional)",
            "conversationId": "string (optional, to continue existing conversation)",
        },
        "response": {
            "conversationId": "string",
            "mentorResponse": "string",
            "suggestedActions": ["string"],
            "topic": "string",
            "timestamp": "ISO 8601 datetime",
        },
        "errors": {
            "503": "Service unavailable",
            "500": "Internal server error",
        },
        "example_request": {
            "userId": "user123",
            "topic": "Binary Trees",
            "userMessage": "How do I implement tree traversal?",
            "masteryScore": 0.65,
        },
        "example_response": {
            "conversationId": "conv_abc123",
            "mentorResponse": "Tree traversal can be done in three main ways...",
            "suggestedActions": [
                "Practice implementing DFS algorithm",
                "Study recursion deeply",
                "Solve 5 tree traversal problems",
            ],
            "topic": "Binary Trees",
            "timestamp": "2024-02-14T10:30:00Z",
        },
    },
    "GET /ai/mentor/conversation/{conversation_id}": {
        "description": "Retrieve a specific conversation by ID",
        "parameters": {
            "conversation_id": "string",
        },
        "response": {
            "conversationId": "string",
            "userId": "string",
            "messages": [
                {
                    "role": "user or assistant",
                    "content": "string",
                    "timestamp": "ISO 8601 datetime",
                }
            ],
            "topic": "string",
            "createdAt": "ISO 8601 datetime",
            "updatedAt": "ISO 8601 datetime",
        },
    },
    "GET /ai/mentor/conversations/{user_id}": {
        "description": "Get all conversations for a user",
        "parameters": {
            "user_id": "string",
            "limit": "integer (default: 10)",
        },
        "response": {
            "conversations": [
                {
                    "conversationId": "string",
                    "topic": "string",
                    "createdAt": "ISO 8601 datetime",
                }
            ],
            "count": "integer",
        },
    },
    "DELETE /ai/mentor/conversation/{conversation_id}": {
        "description": "Delete a conversation",
        "response": {
            "success": "boolean",
            "message": "string",
        },
    },
}

# PRACTICE REVIEW SERVICES
PRACTICE_ENDPOINTS = {
    "POST /ai/practice/review": {
        "description": "Review submitted code and provide feedback",
        "request": {
            "userId": "string (required)",
            "problemDescription": "string (required)",
            "userCode": "string (required)",
            "language": "string - python|java|cpp|javascript|csharp|go|rust (required)",
            "difficulty": "string - easy|medium|hard (required)",
            "topic": "string (required)",
            "problemId": "string (optional)",
        },
        "response": {
            "reviewSummary": "string",
            "optimizationSuggestions": ["string"],
            "conceptualFeedback": "string",
            "codeQuality": {
                "readability": "integer 1-10",
                "correctness": "integer 1-10",
                "efficiency": "integer 1-10",
                "bestPractices": "integer 1-10",
                "overall": "integer 1-10",
            },
            "interviewInsights": "string",
            "timestamp": "ISO 8601 datetime",
        },
    },
    "GET /ai/practice/reviews/{user_id}": {
        "description": "Get user's code review history",
        "parameters": {
            "user_id": "string",
            "limit": "integer (default: 10)",
        },
        "response": {
            "reviews": ["Review objects"],
            "count": "integer",
        },
    },
    "POST /ai/practice/compare": {
        "description": "Compare two code solutions",
        "request": {
            "problemDescription": "string",
            "originalCode": "string",
            "optimizedCode": "string",
            "language": "string",
        },
        "response": {
            "comparison": "string",
            "timestamp": "ISO 8601 datetime",
        },
    },
    "POST /ai/practice/optimizations": {
        "description": "Get optimization suggestions for code",
        "request": {
            "language": "string",
            "code": "string",
            "problemType": "string",
        },
        "response": {
            "optimizations": [
                {
                    "name": "string",
                    "benefit": "string",
                    "description": "string",
                }
            ],
        },
    },
}

# INTERVIEW SERVICES
INTERVIEW_ENDPOINTS = {
    "POST /ai/interview/simulate": {
        "description": "Simulate a technical interview",
        "request": {
            "userId": "string (required)",
            "problemContext": "string (required)",
            "candidateExplanation": "string (required)",
            "topic": "string (required)",
            "difficulty": "string - easy|medium|hard (optional)",
            "interviewSessionId": "string (optional)",
        },
        "response": {
            "interviewSessionId": "string",
            "followUpQuestions": ["string"],
            "reasoningFeedback": "string",
            "communicationScoreEstimate": "float 1-10",
            "technicalFeedback": "string",
            "strengths": ["string"],
            "areasForImprovement": ["string"],
            "suggestions": ["string"],
            "timestamp": "ISO 8601 datetime",
        },
    },
    "GET /ai/interview/session/{session_id}": {
        "description": "Get interview session details",
        "parameters": {
            "session_id": "string",
        },
        "response": {
            "userId": "string",
            "sessionId": "string",
            "topic": "string",
            "evaluation": {
                "communicationScore": "float",
            },
            "createdAt": "ISO 8601 datetime",
        },
    },
    "GET /ai/interview/history/{user_id}": {
        "description": "Get user's interview simulation history",
        "parameters": {
            "user_id": "string",
            "limit": "integer (default: 10)",
        },
        "response": {
            "sessions": ["Session objects"],
            "count": "integer",
        },
    },
    "GET /ai/interview/progress/{user_id}": {
        "description": "Get interview performance progress and trends",
        "response": {
            "totalSessions": "integer",
            "averageScore": "float",
            "improvementTrend": "improving|stable|declining",
            "scores": ["float"],
            "topicsAttempted": ["string"],
        },
    },
}

# LEARNING SERVICES
LEARNING_ENDPOINTS = {
    "POST /ai/learning/generate": {
        "description": "Generate comprehensive learning content",
        "request": {
            "topic": "string (required)",
            "subject": "string (required)",
            "difficultyLevel": "string - easy|medium|hard (default: medium)",
            "userKnowledgeLevel": "integer 1-5 (default: 3)",
            "contentType": "string - comprehensive|summary|flashcards (default: comprehensive)",
            "focusAreas": ["string"] (optional)",
        },
        "response": {
            "topic": "string",
            "summary": "string",
            "keyConcepts": ["string"],
            "examples": ["string"],
            "flashcards": [
                {
                    "question": "string",
                    "answer": "string",
                    "difficulty": "string (optional)",
                }
            ],
            "practiceQuestions": ["string"],
            "commonMistakes": ["string"],
            "nextTopics": ["string"],
            "visualExplanations": "string (optional)",
            "realWorldApplications": ["string"],
            "estimatedLearningTime": "integer (minutes)",
            "timestamp": "ISO 8601 datetime",
        },
    },
    "GET /ai/learning/summary/{topic}": {
        "description": "Get quick summary of a topic",
        "parameters": {
            "topic": "string",
            "max_length": "integer (default: 500)",
        },
        "response": {
            "topic": "string",
            "summary": "string",
        },
    },
    "GET /ai/learning/explain/{concept}": {
        "description": "Get detailed explanation of a concept",
        "parameters": {
            "concept": "string",
            "detail_level": "string - beginner|intermediate|advanced (default: intermediate)",
        },
        "response": {
            "concept": "string",
            "explanation": "string",
        },
    },
}

# HEALTH CHECK
HEALTH_ENDPOINT = {
    "GET /ai/health": {
        "description": "Check health of all AI services",
        "response": {
            "status": "string - healthy|unhealthy",
            "gemini": "string - initialized",
            "mentor": "boolean",
            "practice_review": "boolean",
            "interview": "boolean",
            "learning": "boolean",
        },
    },
}

# HTTP STATUS CODES
HTTP_STATUS_CODES = {
    "200": "Success",
    "201": "Created",
    "400": "Bad Request - Invalid input",
    "404": "Not Found",
    "500": "Internal Server Error",
    "503": "Service Unavailable",
    "504": "Gateway Timeout",
}

# ERROR RESPONSE FORMAT
ERROR_RESPONSE_FORMAT = {
    "detail": "string (error message)",
    "status_code": "integer",
    "timestamp": "ISO 8601 datetime (optional)",
}

# RATE LIMITING (if implemented)
RATE_LIMITING = {
    "description": "All endpoints have rate limiting to prevent abuse",
    "defaults": {
        "requests_per_minute": 60,
        "requests_per_hour": 1000,
    },
    "headers": {
        "X-RateLimit-Limit": "Maximum requests allowed",
        "X-RateLimit-Remaining": "Requests remaining in current window",
        "X-RateLimit-Reset": "Unix timestamp when limit resets",
    },
}

# AUTHENTICATION (if implemented)
AUTHENTICATION = {
    "method": "Bearer Token (optional)",
    "header": "Authorization: Bearer <token>",
    "implementation": "JWT tokens (optional, can be added later)",
}

API_SPECIFICATION = {
    "title": "Prepmate AI Services API",
    "version": "1.0.0",
    "description": "Gemini-powered LLM services for interview preparation",
    "base_url": "http://localhost:8000",
    "protocols": ["HTTP", "HTTPS"],
    "endpoints": {
        "mentor": MENTOR_ENDPOINTS,
        "practice": PRACTICE_ENDPOINTS,
        "interview": INTERVIEW_ENDPOINTS,
        "learning": LEARNING_ENDPOINTS,
        "health": HEALTH_ENDPOINT,
    },
    "status_codes": HTTP_STATUS_CODES,
    "error_format": ERROR_RESPONSE_FORMAT,
}


def print_api_spec():
    """Print formatted API specification"""
    import json

    print(json.dumps(API_SPECIFICATION, indent=2))


if __name__ == "__main__":
    print_api_spec()
