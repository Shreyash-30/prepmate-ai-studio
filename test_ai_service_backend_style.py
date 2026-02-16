#!/usr/bin/env python3
"""
Test the AI service endpoint exactly like the Node.js backend does
This will help us identify if there's a Python-specific issue
"""

import requests
import json

def test_ai_service_like_backend():
    """Test AI service with exact request structure that backend sends"""
    
    # This is the exact learner profile structure from llmQuestionGenerationService.js
    learner_profile = {
        "userId": "user-123",
        "userName": "Shreyash",
        "learningLevel": "intermediate",
        "targetCompanies": "Google, Meta, Amazon",
        "preparationGoal": "practice",
        "topicId": "Arrays & Hashing",  # Topic name from MongoDB
        "topicDescription": "Working with arrays and hash-based data structures",
        "masteryScore": 45,
        "progressionReadinessScore": 60,
        "retentionProbability": 0.75,
        "currentDifficultyLevel": "Easy",
        "totalAttempts": 10,
        "successfulAttempts": 6,
        "weakSubtopics": "Sliding window, Two pointers",
        "recentMistakePatterns": "Off-by-one errors, incorrect loop bounds",
        "recommendedDifficulty": "Easy",
        "desiredQuestionCount": 5,
    }
    
    request_body = {
        "learnerProfile": learner_profile,
        "limit": 5,
    }
    
    print("\n" + "="*80)
    print("🧪 TESTING AI SERVICE LIKE BACKEND DOES")
    print("="*80)
    
    print(f"\n📤 Request Details:")
    print(f"   Endpoint: POST http://localhost:8001/ai/practice/generate-questions")
    print(f"   Content-Type: application/json")
    print(f"\n📦 Request Body:")
    print(json.dumps(request_body, indent=2))
    
    try:
        print(f"\n🔄 Sending request...")
        response = requests.post(
            "http://localhost:8001/ai/practice/generate-questions",
            json=request_body,
            timeout=30
        )
        
        print(f"\n✅ Response Received:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Content-Type: {response.headers.get('content-type', 'Unknown')}")
        
        response_data = response.json()
        
        print(f"\n📊 Response Data:")
        print(f"   Keys: {', '.join(response_data.keys())}")
        print(f"   success: {response_data.get('success')}")
        print(f"   questions count: {len(response_data.get('questions', []))}")
        print(f"   source: {response_data.get('source', 'unknown')}")
        print(f"   message: {response_data.get('message', 'None')}")
        print(f"   error: {response_data.get('error', 'None')}")
        
        print(f"\n📋 Full Response:")
        print(json.dumps(response_data, indent=2)[:1000])
        
        # Check the actual success field
        if response_data.get("success") == True and response_data.get("questions"):
            print(f"\n✅ SUCCESS! AI service returned valid questions")
            print(f"   Generated {len(response_data['questions'])} questions")
            if response_data['questions']:
                print(f"   First question: {response_data['questions'][0].get('problemTitle')}")
        else:
            print(f"\n❌ ISSUE DETECTED!")
            print(f"   success field: {response_data.get('success')}")
            print(f"   questions present: {bool(response_data.get('questions'))}")
            print(f"   Full response to debug:")
            print(json.dumps(response_data, indent=2))
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Request Failed:")
        print(f"   Error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Status: {e.response.status_code}")
            try:
                print(f"   Response: {e.response.json()}")
            except:
                print(f"   Response: {e.response.text}")
    
    except Exception as e:
        print(f"\n❌ Unexpected Error:")
        print(f"   {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    test_ai_service_like_backend()
