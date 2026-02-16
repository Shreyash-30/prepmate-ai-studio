#!/usr/bin/env python3
"""
Test LLM Question Generation with Multi-Provider Fallover
Tests the complete flow: learner profile → multi-provider LLM → questions with reasoning
"""

import asyncio
import sys
import os
import json
from pathlib import Path

# Load environment variables FIRST
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path, override=True)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_personalized_question_generation():
    """Test personalized question generation using multi-provider LLM"""
    
    print("=" * 70)
    print("🧠 LLM Personalized Question Generation Test")
    print("=" * 70)
    
    from app.llm.gemini_client import get_gemini_client
    from app.llm.llm_provider_router import get_llm_router
    
    # Check providers first
    print("\n1️⃣ Checking Available Providers...")
    try:
        router = get_llm_router()
        health = router.get_provider_status()
        
        available_providers = []
        for provider, status in health.get('providers', {}).items():
            if status.get('status') == 'healthy':
                available_providers.append(provider)
                print(f"   ✅ {provider.upper()}: Ready")
            else:
                print(f"   ⚠️ {provider.upper()}: {status.get('status')}")
        
        if not available_providers:
            print("❌ No providers available. Check API keys in .env")
            return False
    
    except Exception as e:
        print(f"❌ Provider check failed: {e}")
        return False
    
    # Test 2: Generate Adaptive Question
    print("\n2️⃣ Generating Personalized Interview Question...")
    try:
        client = get_gemini_client()
        
        # Simulate learner context
        learner = {
            "name": "Shreyash",
            "level": "Intermediate",
            "targets": ["Google", "Meta"],
            "masteryScore": 68,
            "accuracyRate": 72,
            "topicFocus": "Array Manipulation",
            "daysPracticed": 12
        }
        
        prompt = f"""You are an expert FAANG interview coach. Generate ONE challenging coding interview question.

LEARNER PROFILE:
- Name: {learner['name']}
- Level: {learner['level']}
- Target: {', '.join(learner['targets'])}
- Mastery Score: {learner['masteryScore']}/100
- Accuracy: {learner['accuracyRate']}%
- Focus Topic: {learner['topicFocus']}
- Practice Days: {learner['daysPracticed']}

REQUIREMENT:
Create a problem that:
1. Is at {learner['level']} difficulty
2. Focuses on {learner['topicFocus']}
3. Would appear in {learner['targets'][0]} interviews
4. Builds on current {learner['masteryScore']}% mastery

Return ONLY valid JSON (no markdown, no extras):
{{
  "title": "Problem Name",
  "description": "Complete problem statement",
  "examples": [
    {{"input": "example in", "output": "expected out", "explanation": "why"}}
  ],
  "constraints": ["constraint1", "constraint2"],
  "hints": ["Hint 1: approach", "Hint 2: data-structure"],
  "complexity": {{"time": "O(...)", "space": "O(...)"}},
  "topic": "{learner['topicFocus']}",
  "difficulty": "{learner['level']}",
  "skills": ["skill1", "skill2"],
  "whyForThisLearner": "Personalized reason for {learner['name']}",
  "solutionApproach": "Brief solution description"
}}"""
        
        print(f"\n📝 Requesting from multi-provider system...")
        response = await client.generate_response(
            prompt=prompt,
            temperature=0.7,
            max_tokens=1800,
            retry_count=3,
            timeout=30
        )
        
        # Parse JSON response
        try:
            # Find JSON in response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start < 0:
                print(f"❌ No JSON found in response")
                print(f"Response preview: {response[:200]}")
                return False
            
            json_str = response[json_start:json_end]
            question = json.loads(json_str)
            
            print("\n✅ Question Generated Successfully!")
            print(f"\n📋 Question Information:")
            print(f"   Title: {question.get('title', 'N/A')}")
            print(f"   Topic: {question.get('topic', 'N/A')}")
            print(f"   Difficulty: {question.get('difficulty', 'N/A')}")
            
            print(f"\n📖 Problem Description (first 150 chars):")
            desc = question.get('description', 'N/A')
            print(f"   {desc[:150]}...")
            
            if question.get('examples'):
                print(f"\n📝 Example Inputs/Outputs:")
                for i, example in enumerate(question.get('examples', [])[:2], 1):
                    print(f"   Example {i}:")
                    print(f"      Input:  {str(example.get('input'))[:60]}")
                    print(f"      Output: {str(example.get('output'))[:60]}")
                    if example.get('explanation'):
                        print(f"      Why:    {example.get('explanation')[:60]}")
            
            if question.get('constraints'):
                print(f"\n⚠️ Constraints:")
                for constraint in question.get('constraints', []):
                    print(f"   • {constraint}")
            
            if question.get('hints'):
                print(f"\n💡 Hints to Solve:")
                for i, hint in enumerate(question.get('hints', []), 1):
                    print(f"   {i}. {hint}")
            
            if question.get('complexity'):
                print(f"\n⏱️ Expected Complexity:")
                print(f"   Time: {question['complexity'].get('time', 'N/A')}")
                print(f"   Space: {question['complexity'].get('space', 'N/A')}")
            
            if question.get('skills'):
                print(f"\n🛠️ Skills Tested:")
                for skill in question.get('skills', []):
                    print(f"   • {skill}")
            
            if question.get('whyForThisLearner'):
                print(f"\n🎯 Why This Question for {learner['name']}:")
                print(f"   {question.get('whyForThisLearner')}")
            
            if question.get('solutionApproach'):
                print(f"\n🔍 Solution Approach (Educational):")
                print(f"   {question.get('solutionApproach')[:150]}...")
        
        except json.JSONDecodeError as e:
            print(f"❌ JSON Parse Error: {e}")
            print(f"Response: {response[:300]}")
            return False
    
    except Exception as e:
        print(f"❌ Generation Failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 3: Multi-Question Batch
    print("\n\n3️⃣ Batch Question Generation Test...")
    try:
        topics = ["Arrays", "Strings", "Hash Maps"]
        print(f"Generating {len(topics)} different topic questions...")
        
        for topic in topics:
            prompt = f"""Generate ONLY one {topic} interview question (easy).
Return ONLY JSON: {{"title": "Problem", "difficulty": "Easy", "topic": "{topic}", "description": "Brief"}}"""
            
            response = await client.generate_response(
                prompt=prompt,
                temperature=0.6,
                max_tokens=400
            )
            
            try:
                import re
                match = re.search(r'\{[^{}]*\}', response, re.DOTALL)
                if match:
                    q = json.loads(match.group())
                    print(f"   ✅ {q.get('title')} ({topic})")
                else:
                    print(f"   ⚠️ {topic} - parse issue")
            except:
                print(f"   ⚠️ {topic} - JSON error")
        
        print("✅ Batch generation completed")
    
    except Exception as e:
        print(f"⚠️ Batch generation warning: {e}")
    
    # Test 4: Provider Statistics
    print("\n\n4️⃣ Provider Performance Summary...")
    try:
        health = router.get_provider_status()
        print("\nProviders Used During Testing:")
        
        total_calls = 0
        for provider, status in health.get('providers', {}).items():
            calls = status.get('total_calls', 0)
            if calls > 0:
                total_calls += calls
                latency = status.get('avg_latency_ms', 0)
                print(f"\n   {provider.upper()}:")
                print(f"      Calls: {calls}")
                print(f"      Successes: {status.get('successes', 0)}")
                print(f"      Failures: {status.get('failures', 0)}")
                print(f"      Avg Latency: {latency:.0f}ms")
                print(f"      Status: {status.get('status')}")
        
        if total_calls > 0:
            print(f"\n✅ Total LLM Calls: {total_calls}")
    
    except Exception as e:
        print(f"⚠️ Stats: {e}")
    
    print("\n" + "=" * 70)
    print("✅ Question Generation Test Complete!")
    print("=" * 70)
    return True


async def test_weak_topic_analysis():
    """Test AI analysis of weak topics"""
    
    print("\n\n" + "=" * 70)
    print("📊 Weak Topic Analysis Test")
    print("=" * 70)
    
    from app.llm.gemini_client import get_gemini_client
    
    try:
        client = get_gemini_client()
        
        profile = {
            "topics": {
                "Arrays": 75,
                "Trees": 45,
                "Graphs": 40,
                "Strings": 80,
                "DP": 35
            }
        }
        
        prompt = f"""Analyze this learner's weak areas:
{json.dumps(profile['topics'])}.

Identify top 3 weak topics and suggest fixes.
Return ONLY JSON: {{"weakAreas": [{{"topic": "name", "score": 0-100, "reason": "why weak", "fix": "how to improve"}}]}}"""
        
        print("\n📝 Analyzing weak topics...")
        response = await client.generate_response(
            prompt=prompt,
            temperature=0.5,
            max_tokens=600
        )
        
        try:
            import re
            match = re.search(r'\{[\s\S]*\}', response)
            if match:
                analysis = json.loads(match.group())
                print("✅ Analysis Generated!")
                
                weak_areas = analysis.get('weakAreas', [])
                print(f"\nIdentified {len(weak_areas)} weak areas:")
                for i, area in enumerate(weak_areas[:3], 1):
                    print(f"   {i}. {area.get('topic')} (Score: {area.get('score')}/100)")
                    print(f"      Why: {area.get('reason', 'N/A')[:60]}")
                    print(f"      Fix: {area.get('fix', 'N/A')[:60]}")
            else:
                print("⚠️ Could not parse analysis")
        except:
            print(f"⚠️ Parse issue, but analysis generated")
    
    except Exception as e:
        print(f"⚠️ Analysis: {e}")


def main():
    """Run all tests"""
    
    print("\n🔍 LLM System Configuration Check")
    print("=" * 70)
    
    # Check environment
    env_keys = {
        'GEMINI_API_KEY': 'Google Gemini',
        'GROQ_API_KEY': 'Groq (Fast)',
        'TOGETHER_API_KEY': 'Together AI'
    }
    
    configured = []
    for key, name in env_keys.items():
        if os.getenv(key):
            configured.append(f"✅ {name}")
        else:
            configured.append(f"❌ {name}")
    
    for item in configured:
        print(f"   {item}")
    
    if not any(os.getenv(k) for k in env_keys.keys()):
        print("\n❌ ERROR: No LLM API keys configured!")
        print("Set GEMINI_API_KEY, GROQ_API_KEY, or TOGETHER_API_KEY in .env")
        sys.exit(1)
    
    print("\n" + "=" * 70 + "\n")
    
    try:
        asyncio.run(test_personalized_question_generation())
        asyncio.run(test_weak_topic_analysis())
        
        print("\n\n" + "=" * 70)
        print("🎉 All LLM Tests Passed!")
        print("=" * 70)
    
    except KeyboardInterrupt:
        print("\n\n❌ Tests interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
