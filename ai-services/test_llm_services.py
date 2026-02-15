"""
Test script for LLM Services
Run: python test_llm_services.py
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")


async def test_health():
    """Test health endpoint"""
    print("\n📋 Testing Health Check...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/ai/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")


async def test_mentor_chat():
    """Test mentor chat endpoint"""
    print("\n🧑‍🏫 Testing Mentor Chat...")
    async with httpx.AsyncClient() as client:
        request_data = {
            "userId": "test_user_1",
            "topic": "Binary Search Trees",
            "userMessage": "How do I balance a BST during insertion?",
            "masteryScore": 0.6,
        }

        response = await client.post(
            f"{BASE_URL}/ai/mentor/chat",
            json=request_data,
            timeout=60.0,
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Conversation ID: {data.get('conversationId')}")
        print(f"Response: {data.get('mentorResponse', '')[:200]}...")


async def test_code_review():
    """Test code review endpoint"""
    print("\n👀 Testing Code Review...")
    async with httpx.AsyncClient() as client:
        request_data = {
            "userId": "test_user_1",
            "problemDescription": "Write a function to find the two sum in an array",
            "userCode": """def twoSum(nums, target):
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []""",
            "language": "python",
            "difficulty": "easy",
            "topic": "array",
        }

        response = await client.post(
            f"{BASE_URL}/ai/practice/review",
            json=request_data,
            timeout=60.0,
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Review Summary: {data.get('reviewSummary', '')[:200]}...")


async def test_interview_simulation():
    """Test interview simulation endpoint"""
    print("\n🎤 Testing Interview Simulation...")
    async with httpx.AsyncClient() as client:
        request_data = {
            "userId": "test_user_1",
            "problemContext": "Design a system to detect the median of a stream of numbers",
            "candidateExplanation": "I would use two heaps - a max heap for smaller numbers and a min heap for larger numbers. This allows O(log n) insertion and O(1) retrieval of median.",
            "topic": "Heaps",
            "difficulty": "hard",
        }

        response = await client.post(
            f"{BASE_URL}/ai/interview/simulate",
            json=request_data,
            timeout=60.0,
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Communication Score: {data.get('communicationScoreEstimate')}")
        print(f"Follow-up Questions: {data.get('followUpQuestions', [])}")


async def test_learning_content():
    """Test learning content generation endpoint"""
    print("\n📚 Testing Learning Content Generation...")
    async with httpx.AsyncClient() as client:
        request_data = {
            "topic": "Dynamic Programming Basics",
            "subject": "DSA",
            "difficultyLevel": "medium",
            "userKnowledgeLevel": 2,
        }

        response = await client.post(
            f"{BASE_URL}/ai/learning/generate",
            json=request_data,
            timeout=120.0,  # Longer timeout for content generation
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Topic: {data.get('topic')}")
        print(f"Key Concepts: {data.get('keyConcepts', [])[:3]}")
        print(f"Estimated Learning Time: {data.get('estimatedLearningTime')} minutes")


async def test_quick_summary():
    """Test quick summary endpoint"""
    print("\n⚡ Testing Quick Summary...")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/ai/learning/summary/Recursion",
            timeout=30.0,
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Summary: {data.get('summary', '')[:200]}...")


async def main():
    """Run all tests"""
    print("🚀 Starting LLM Services Test Suite")
    print(f"Base URL: {BASE_URL}")

    try:
        await test_health()
        await test_mentor_chat()
        await test_code_review()
        await test_interview_simulation()
        await test_learning_content()
        await test_quick_summary()

        print("\n✅ All tests completed!")

    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
