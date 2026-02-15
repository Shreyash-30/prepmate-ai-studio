"""
Test LLM Question Generation and Learning Content
Tests Gemini API integration for generating questions and detailed content
"""
import asyncio
import httpx
import json
from datetime import datetime

# AI Service Base URL
BASE_URL = "http://localhost:8001"
TIMEOUT = 60.0  # 60 seconds for LLM responses

async def test_health_check():
    """Test API health check"""
    print("\n" + "="*70)
    print("TEST 1: Health Check")
    print("="*70)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}/ai/health",
                timeout=10
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_quick_summary():
    """Test quick topic summary"""
    print("\n" + "="*70)
    print("TEST 2: Quick Topic Summary")
    print("="*70)
    
    topic = "Binary Search Trees"
    print(f"Topic: {topic}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}/ai/learning/summary/{topic}",
                params={"max_length": 500},
                timeout=TIMEOUT
            )
            print(f"\nStatus: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"\nTopic: {data.get('topic')}")
                print(f"\nSummary:\n{data.get('summary')}")
                print("\n✅ Quick summary test PASSED")
                return True
            else:
                print(f"❌ Error: {response.text}")
                return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_concept_explanation():
    """Test detailed concept explanation"""
    print("\n" + "="*70)
    print("TEST 3: Concept Explanation")
    print("="*70)
    
    concept = "Dynamic Programming"
    detail_level = "advanced"
    print(f"Concept: {concept}")
    print(f"Detail Level: {detail_level}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}/ai/learning/explain/{concept}",
                params={"detail_level": detail_level},
                timeout=TIMEOUT
            )
            print(f"\nStatus: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"\nConcept: {data.get('concept')}")
                print(f"\nExplanation:\n{data.get('explanation')}")
                print("\n✅ Concept explanation test PASSED")
                return True
            else:
                print(f"❌ Error: {response.text}")
                return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_learning_content_generation():
    """Test comprehensive learning content generation"""
    print("\n" + "="*70)
    print("TEST 4: Generate Learning Content (Comprehensive)")
    print("="*70)
    
    request_payload = {
        "topic": "Arrays and Hashing",
        "subject": "Data Structures",
        "difficultyLevel": "medium",
        "userKnowledgeLevel": 3,
        "contentType": "comprehensive",
        "focusAreas": ["hash tables", "collision resolution", "use cases"]
    }
    
    print(f"Request: {json.dumps(request_payload, indent=2)}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/ai/learning/generate",
                json=request_payload,
                timeout=TIMEOUT
            )
            print(f"\nStatus: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"\n✅ Learning Content Generated Successfully!")
                print(f"\nTopic: {data.get('topic')}")
                print(f"Estimated Learning Time: {data.get('estimatedLearningTime')} minutes")
                
                # Summary
                summary = data.get('summary', '')
                print(f"\nSummary:\n{summary[:500]}...")
                
                # Key Concepts
                concepts = data.get('keyConcepts', [])
                print(f"\nKey Concepts ({len(concepts)}):")
                for i, concept in enumerate(concepts[:5], 1):
                    print(f"  {i}. {concept}")
                
                # Examples
                examples = data.get('examples', [])
                print(f"\nExamples ({len(examples)}):")
                for i, example in enumerate(examples[:3], 1):
                    print(f"  {i}. {example[:80]}...")
                
                # Flashcards
                flashcards = data.get('flashcards', [])
                print(f"\nFlashcards ({len(flashcards)}):")
                for i, card in enumerate(flashcards[:3], 1):
                    print(f"  Card {i}:")
                    print(f"    Q: {card.get('question')[:75]}...")
                    print(f"    A: {card.get('answer')[:75]}...")
                
                # Practice Questions
                questions = data.get('practiceQuestions', [])
                print(f"\nPractice Questions ({len(questions)}):")
                for i, q in enumerate(questions[:2], 1):
                    print(f"  Q{i}: {q.get('question')[:75]}...")
                    print(f"    Difficulty: {q.get('difficulty')}")
                
                # Common Mistakes
                mistakes = data.get('commonMistakes', [])
                print(f"\nCommon Mistakes ({len(mistakes)}):")
                for i, mistake in enumerate(mistakes[:3], 1):
                    print(f"  {i}. {mistake[:75]}...")
                
                # Next Topics
                next_topics = data.get('nextTopics', [])
                print(f"\nSuggested Next Topics ({len(next_topics)}):")
                for i, topic in enumerate(next_topics[:3], 1):
                    print(f"  {i}. {topic}")
                
                print("\n✅ Learning content generation test PASSED")
                return True
            else:
                print(f"❌ Error: {response.text}")
                return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_mentor_chat():
    """Test mentor chat functionality"""
    print("\n" + "="*70)
    print("TEST 5: Mentor Chat (Question About Topic)")
    print("="*70)
    
    request_payload = {
        "userId": "test-user-001",
        "topic": "Two Pointer Technique",
        "userMessage": "How do I apply the two-pointer technique to solve the container with most water problem?",
        "preparationContext": "Preparing for technical interviews",
        "masteryScore": 0.65
    }
    
    print(f"User ID: {request_payload['userId']}")
    print(f"Topic: {request_payload['topic']}")
    print(f"User Message: {request_payload['userMessage']}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/ai/mentor/chat",
                json=request_payload,
                timeout=TIMEOUT
            )
            print(f"\nStatus: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"\n✅ Mentor Chat Response Received!")
                print(f"\nConversation ID: {data.get('conversationId')}")
                print(f"Topic: {data.get('topic')}")
                
                # Mentor Response
                mentor_response = data.get('mentorResponse', '')
                print(f"\nMentor Response:\n{mentor_response}")
                
                # Actions
                actions = data.get('suggestedActions', [])
                print(f"\nSuggested Actions ({len(actions)}):")
                for i, action in enumerate(actions[:3], 1):
                    print(f"  {i}. {action}")
                
                print("\n✅ Mentor chat test PASSED")
                return True
            else:
                print(f"❌ Error: {response.text}")
                return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_interview_simulation():
    """Test interview simulation"""
    print("\n" + "="*70)
    print("TEST 6: Interview Simulation")
    print("="*70)
    
    request_payload = {
        "userId": "test-user-001",
        "problemContext": "Given an array of integers, find two numbers that add up to a target sum. Return their indices.",
        "candidateExplanation": "I would use a hash map to store the numbers I've seen so far. For each number, I check if (target - current_number) exists in the hash map. Time complexity: O(n), Space: O(n)",
        "topic": "Hash Maps",
        "difficulty": "easy"
    }
    
    print(f"User ID: {request_payload['userId']}")
    print(f"Problem: {request_payload['problemContext']}")
    print(f"Candidate Explanation: {request_payload['candidateExplanation']}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/ai/interview/simulate",
                json=request_payload,
                timeout=TIMEOUT
            )
            print(f"\nStatus: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"\n✅ Interview Simulation Response Received!")
                print(f"\nSession ID: {data.get('interviewSessionId')}")
                print(f"Communication Score: {data.get('communicationScoreEstimate')}/10")
                
                # Feedback
                feedback = data.get('reasoningFeedback', '')
                print(f"\nReasoning Feedback:\n{feedback}")
                
                # Technical feedback
                tech_feedback = data.get('technicalFeedback', '')
                print(f"\nTechnical Feedback:\n{tech_feedback}")
                
                # Strengths
                strengths = data.get('strengths', [])
                print(f"\nStrengths ({len(strengths)}):")
                for i, strength in enumerate(strengths[:3], 1):
                    print(f"  {i}. {strength}")
                
                # Areas for improvement
                improvements = data.get('areasForImprovement', [])
                print(f"\nAreas for Improvement ({len(improvements)}):")
                for i, area in enumerate(improvements[:3], 1):
                    print(f"  {i}. {area}")
                
                # Follow-up questions
                followups = data.get('followUpQuestions', [])
                print(f"\nFollow-up Questions ({len(followups)}):")
                for i, q in enumerate(followups[:2], 1):
                    print(f"  {i}. {q}")
                
                print("\n✅ Interview simulation test PASSED")
                return True
            else:
                print(f"❌ Error: {response.text}")
                return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_code_review():
    """Test code review functionality"""
    print("\n" + "="*70)
    print("TEST 7: Code Review")
    print("="*70)
    
    request_payload = {
        "userId": "test-user-001",
        "problemDescription": "Two Sum - Find two numbers that add up to a target",
        "userCode": """def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return None""",
        "language": "python",
        "difficulty": "easy",
        "topic": "Hash Maps"
    }
    
    print(f"Problem: {request_payload['problemDescription']}")
    print(f"Language: {request_payload['language']}")
    print(f"Code:\n{request_payload['userCode']}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/ai/practice/review",
                json=request_payload,
                timeout=TIMEOUT
            )
            print(f"\nStatus: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"\n✅ Code Review Received!")
                
                # Summary
                summary = data.get('reviewSummary', '')
                print(f"\nReview Summary:\n{summary}")
                
                # Code Quality
                quality = data.get('codeQuality', {})
                print(f"\nCode Quality:")
                for metric, score in quality.items():
                    print(f"  {metric}: {score}")
                
                # Optimizations
                optimizations = data.get('optimizationSuggestions', [])
                print(f"\nOptimization Suggestions ({len(optimizations)}):")
                for i, opt in enumerate(optimizations[:3], 1):
                    print(f"  {i}. {opt}")
                
                # Interview Insights
                insights = data.get('interviewInsights', '')
                print(f"\nInterview Insights:\n{insights}")
                
                print("\n✅ Code review test PASSED")
                return True
            else:
                print(f"❌ Error: {response.text}")
                return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def main():
    """Run all tests"""
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*10 + "AI SERVICES - LLM QUESTION GENERATION TEST" + " "*16 + "║")
    print("╚" + "="*68 + "╝")
    
    tests = [
        ("Health Check", test_health_check),
        ("Quick Summary", test_quick_summary),
        ("Concept Explanation", test_concept_explanation),
        ("Learning Content", test_learning_content_generation),
        ("Mentor Chat", test_mentor_chat),
        ("Interview Simulation", test_interview_simulation),
        ("Code Review", test_code_review),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results[test_name] = "✅ PASSED" if result else "❌ FAILED"
        except Exception as e:
            print(f"\n❌ Exception in {test_name}: {e}")
            results[test_name] = f"❌ ERROR: {e}"
    
    # Summary
    print("\n\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for r in results.values() if "PASSED" in r)
    total = len(results)
    
    for test_name, result in results.items():
        print(f"{test_name:.<50} {result}")
    
    print("="*70)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests PASSED! LLM is generating questions correctly!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")


if __name__ == "__main__":
    asyncio.run(main())
