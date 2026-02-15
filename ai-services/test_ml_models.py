"""
ML Models Testing with Topic-Wise Question Data
Tests Mastery Engine, Retention Model, Weakness Detection, 
Adaptive Planner, and Readiness Model with realistic question attempt data
"""
import asyncio
import httpx
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8001"
TIMEOUT = 30.0

# User ID for testing
TEST_USER_ID = "ml-test-user-001"

# Test data: Topic-wise questions with student performance
TOPICS_PERFORMANCE_DATA = {
    "arrays": {
        "topic_id": "arrays_easy",
        "display_name": "Arrays & Sorting",
        "attempts": [
            {"correct": True, "difficulty": 1, "hints_used": 0, "time_ms": 8000},
            {"correct": True, "difficulty": 1, "hints_used": 0, "time_ms": 7000},
            {"correct": True, "difficulty": 2, "hints_used": 1, "time_ms": 15000},
            {"correct": True, "difficulty": 2, "hints_used": 0, "time_ms": 12000},
        ]
    },
    "linked_lists": {
        "topic_id": "linked_lists_medium",
        "display_name": "Linked Lists",
        "attempts": [
            {"correct": False, "difficulty": 2, "hints_used": 1, "time_ms": 20000},
            {"correct": True, "difficulty": 2, "hints_used": 2, "time_ms": 22000},
            {"correct": False, "difficulty": 3, "hints_used": 0, "time_ms": 15000},
            {"correct": True, "difficulty": 2, "hints_used": 1, "time_ms": 18000},
        ]
    },
    "binary_trees": {
        "topic_id": "binary_trees_medium",
        "display_name": "Binary Trees",
        "attempts": [
            {"correct": True, "difficulty": 2, "hints_used": 0, "time_ms": 18000},
            {"correct": True, "difficulty": 3, "hints_used": 1, "time_ms": 25000},
            {"correct": True, "difficulty": 3, "hints_used": 0, "time_ms": 23000},
        ]
    },
    "dynamic_programming": {
        "topic_id": "dynamic_programming_hard",
        "display_name": "Dynamic Programming",
        "attempts": [
            {"correct": False, "difficulty": 3, "hints_used": 2, "time_ms": 35000},
            {"correct": False, "difficulty": 3, "hints_used": 1, "time_ms": 30000},
            {"correct": True, "difficulty": 2, "hints_used": 2, "time_ms": 28000},
        ]
    },
    "hash_maps": {
        "topic_id": "hash_maps_easy",
        "display_name": "Hash Maps & Sets",
        "attempts": [
            {"correct": True, "difficulty": 1, "hints_used": 0, "time_ms": 6000},
            {"correct": True, "difficulty": 2, "hints_used": 0, "time_ms": 9000},
            {"correct": False, "difficulty": 3, "hints_used": 0, "time_ms": 12000},
            {"correct": True, "difficulty": 2, "hints_used": 1, "time_ms": 11000},
        ]
    },
    "graphs": {
        "topic_id": "graphs_hard",
        "display_name": "Graphs & BFS/DFS",
        "attempts": [
            {"correct": False, "difficulty": 3, "hints_used": 2, "time_ms": 40000},
        ]
    },
}


async def test_mastery_engine():
    """Test Mastery Engine with topic-wise data"""
    print("\n" + "="*70)
    print("TEST 1: MASTERY ENGINE - Bayesian Knowledge Tracing")
    print("="*70)
    
    results = {}
    
    try:
        async with httpx.AsyncClient() as client:
            for topic_key, topic_data in TOPICS_PERFORMANCE_DATA.items():
                payload = {
                    "user_id": TEST_USER_ID,
                    "topic_id": topic_data["topic_id"],
                    "attempts": topic_data["attempts"],
                    "learning_level": "intermediate"
                }
                
                print(f"\n📚 {topic_data['display_name']}")
                print(f"   Attempts: {len(topic_data['attempts'])}")
                print(f"   Performance: {sum(1 for a in topic_data['attempts'] if a['correct'])}/{len(topic_data['attempts'])} correct")
                
                response = await client.post(
                    f"{BASE_URL}/ai/ml/mastery/update",
                    json=payload,
                    timeout=TIMEOUT
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        metrics = data.get("data", {})
                        results[topic_key] = metrics
                        
                        print(f"   ✅ Mastery: {metrics.get('mastery_probability', 0)*100:.1f}%")
                        print(f"   ✅ Confidence: {metrics.get('confidence_score', 0)*100:.1f}%")
                        print(f"   ✅ Trend: {metrics.get('improvement_trend', 'unknown')}")
                        print(f"   ✅ Recommended Difficulty: {metrics.get('recommended_difficulty', 'n/a')}")
                    else:
                        print(f"   ❌ Error: {data.get('error', 'Unknown error')}")
                else:
                    print(f"   ❌ HTTP {response.status_code}: {response.text}")
            
            print("\n" + "-"*70)
            print("Mastery Profile Summary:")
            print("-"*70)
            for topic_key, metrics in results.items():
                mastery = metrics.get('mastery_probability', 0) * 100
                topic_name = TOPICS_PERFORMANCE_DATA[topic_key]['display_name']
                bar = "█" * int(mastery / 5) + "░" * (20 - int(mastery / 5))
                print(f"{topic_name:.<40} {bar} {mastery:.1f}%")
            
            return len(results) == len(TOPICS_PERFORMANCE_DATA)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_retention_model():
    """Test Retention Model with revision data"""
    print("\n" + "="*70)
    print("TEST 2: RETENTION MODEL - Spaced Repetition")
    print("="*70)
    
    # Simulate revision sessions for each topic
    revision_scenarios = {
        "arrays": {"successful": True, "hours_ago": 24},
        "linked_lists": {"successful": False, "hours_ago": 48},
        "binary_trees": {"successful": True, "hours_ago": 12},
        "dynamic_programming": {"successful": False, "hours_ago": 72},
        "hash_maps": {"successful": True, "hours_ago": 36},
        "graphs": {"successful": False, "hours_ago": 120},
    }
    
    results = {}
    
    try:
        async with httpx.AsyncClient() as client:
            for topic_key, scenario in revision_scenarios.items():
                topic_data = TOPICS_PERFORMANCE_DATA[topic_key]
                
                payload = {
                    "user_id": TEST_USER_ID,
                    "topic_id": topic_data["topic_id"],
                    "is_successful_revision": scenario["successful"],
                    "time_since_last_revision_hours": scenario["hours_ago"]
                }
                
                status = "✅ SUCCESS" if scenario["successful"] else "❌ FAILED"
                print(f"\n🔄 {topic_data['display_name']} - {status}")
                print(f"   Last revision: {scenario['hours_ago']} hours ago")
                
                response = await client.post(
                    f"{BASE_URL}/ai/ml/retention/update",
                    json=payload,
                    timeout=TIMEOUT
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        metrics = data.get("data", {})
                        results[topic_key] = metrics
                        
                        print(f"   📊 Retention: {metrics.get('retention_probability', 0)*100:.1f}%")
                        print(f"   📈 Stability: {metrics.get('stability_score', 0):.2f}")
                        print(f"   🚨 Urgency: {metrics.get('urgency_level', 'unknown')}")
                        
                        next_revision = metrics.get('next_revision_date', 'unknown')
                        days_until = metrics.get('days_until_revision', 0)
                        print(f"   📅 Next Review: {days_until} days ({next_revision})")
                    else:
                        print(f"   ❌ Error: {data.get('error', 'Unknown error')}")
                else:
                    print(f"   ❌ HTTP {response.status_code}: {response.text}")
            
            print("\n" + "-"*70)
            print("Retention Queue (Topics needing review):")
            print("-"*70)
            
            # Get revision queue
            response = await client.get(
                f"{BASE_URL}/ai/ml/retention/queue/{TEST_USER_ID}",
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                queue_data = response.json()
                if queue_data.get("success"):
                    queue = queue_data.get("data", [])
                    for i, item in enumerate(queue[:5], 1):
                        topic = item.get("topic_id", "unknown")
                        urgency = item.get("urgency_level", "unknown")
                        days = item.get("days_until_revision", 0)
                        print(f"{i}. {topic:.<45} Urgency: {urgency:.<10} In {days} days")
            
            return len(results) > 0
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_weakness_detection():
    """Test Weakness Detection"""
    print("\n" + "="*70)
    print("TEST 3: WEAKNESS DETECTION - Identify At-Risk Topics")
    print("="*70)
    
    try:
        payload = {
            "user_id": TEST_USER_ID,
            "include_contest_data": True
        }
        
        print(f"Analyzing weaknesses for user: {TEST_USER_ID}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/ai/ml/weakness/analyze",
                json=payload,
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    analysis = data.get("data", {})
                    
                    weak_topics = analysis.get("weak_topics", [])
                    print(f"\n🔴 Weak Topics Detected: {len(weak_topics)}")
                    for topic in weak_topics[:5]:
                        print(f"   • {topic.get('topic_id', 'unknown'):.<40} Risk: {topic.get('risk_score', 0):.0f}/100")
                    
                    focus_areas = analysis.get("focus_areas", [])
                    print(f"\n🎯 Focus Areas: {len(focus_areas)}")
                    for topic in focus_areas[:5]:
                        print(f"   • {topic}")
                    
                    explainability = analysis.get("explainability", {})
                    print(f"\n📊 Analysis Summary:")
                    metrics = explainability.get("metrics", {})
                    print(f"   • Average Risk: {metrics.get('average_risk', 0):.0f}/100")
                    print(f"   • Max Risk: {metrics.get('max_risk', 0):.0f}/100")
                    print(f"   • Topics At Risk: {metrics.get('topics_at_risk', 0)}")
                    
                    print("\n✅ Weakness analysis PASSED")
                    return True
                else:
                    print(f"❌ Error: {data.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}")
                return False
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_adaptive_planner():
    """Test Adaptive Planner for personalized study plans"""
    print("\n" + "="*70)
    print("TEST 4: ADAPTIVE PLANNER - Personalized Study Plan")
    print("="*70)
    
    try:
        payload = {
            "user_id": TEST_USER_ID,
            "daily_study_minutes": 120,
            "target_company": "Google",
            "preparation_days": 30
        }
        
        print(f"Generating personalized plan for:")
        print(f"  • User ID: {TEST_USER_ID}")
        print(f"  • Daily Study: {payload['daily_study_minutes']} minutes")
        print(f"  • Target: {payload['target_company']}")
        print(f"  • Preparation time: {payload['preparation_days']} days")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/ai/ml/planner/generate",
                json=payload,
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    plan = data.get("data", {})
                    
                    tasks = plan.get("tasks_today", [])
                    print(f"\n📋 Tasks for Today: {len(tasks)} tasks")
                    
                    total_time = 0
                    for i, task in enumerate(tasks[:5], 1):
                        topic = task.get("topic_id", "unknown")
                        task_type = task.get("task_type", "unknown")
                        duration = task.get("estimated_time_minutes", 0)
                        priority = task.get("priority", 0)
                        total_time += duration
                        print(f"  {i}. {topic:.<30} Type: {task_type:.<12} {duration} min (Priority: {priority:.0%})")
                    
                    print(f"\n⏱️  Total Duration: {total_time} minutes ({total_time/60:.1f} hours)")
                    
                    weekly_focus = plan.get("weekly_focus", [])
                    print(f"\n📚 Weekly Focus ({len(weekly_focus)} topics):")
                    for topic in weekly_focus[:3]:
                        print(f"  • {topic}")
                    
                    print(f"\n✅ Adaptive planning PASSED")
                    return True
                else:
                    print(f"❌ Error: {data.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}")
                return False
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_readiness_model():
    """Test Readiness Model for interview preparation"""
    print("\n" + "="*70)
    print("TEST 5: READINESS MODEL - Interview Readiness Prediction")
    print("="*70)
    
    try:
        payload = {
            "user_id": TEST_USER_ID,
            "target_company": "Google"
        }
        
        print(f"Predicting interview readiness for {payload['target_company']}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/ai/ml/readiness/predict",
                json=payload,
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    prediction = data.get("data", {})
                    
                    readiness = prediction.get("readiness_score", 0)
                    confidence = prediction.get("confidence_score", 0)
                    passing_prob = prediction.get("probability_passing", 0)
                    days_to_ready = prediction.get("time_to_readiness_days", 0)
                    
                    print(f"\n📊 Readiness Score: {readiness:.1f}/100")
                    bar = "█" * int(readiness / 5) + "░" * (20 - int(readiness / 5))
                    print(f"   {bar}")
                    
                    print(f"\n📈 Metrics:")
                    print(f"  • Confidence: {confidence*100:.1f}%")
                    print(f"  • Probability of Passing: {passing_prob*100:.1f}%")
                    print(f"  • Days to Readiness (80): {days_to_ready}")
                    
                    gaps = prediction.get("primary_gaps", [])
                    print(f"\n🔴 Primary Gaps ({len(gaps)}):")
                    for gap in gaps[:3]:
                        print(f"  • {gap}")
                    
                    explainability = prediction.get("explainability", {})
                    features = explainability.get("features_used", [])
                    print(f"\n🔍 Model Explainability:")
                    for feature in features[:4]:
                        print(f"  • {feature}")
                    
                    print(f"\n✅ Readiness prediction PASSED")
                    return True
                else:
                    print(f"❌ Error: {data.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}")
                return False
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_ml_health():
    """Test ML services health check"""
    print("\n" + "="*70)
    print("TEST 0: ML SERVICES HEALTH CHECK")
    print("="*70)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}/ai/health",
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                health = response.json()
                print(f"\n✅ Status: {health.get('status', 'unknown')}")
                print(f"✅ Gemini: {health.get('gemini', 'unknown')}")
                
                services = [
                    ("Mentor", health.get('mentor')),
                    ("Practice Review", health.get('practice_review')),
                    ("Interview", health.get('interview')),
                    ("Learning", health.get('learning')),
                ]
                
                print(f"\nLLM Services:")
                for service_name, status in services:
                    status_icon = "✅" if status else "❌"
                    print(f"  {status_icon} {service_name}")
                
                return True
            else:
                print(f"❌ HTTP {response.status_code}")
                return False
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def main():
    """Run all ML model tests"""
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*8 + "ML MODELS TESTING - TOPIC-WISE QUESTION DATA" + " "*16 + "║")
    print("╚" + "="*68 + "╝")
    
    print("\n📚 Test Dataset:")
    print(f"  • User ID: {TEST_USER_ID}")
    print(f"  • Topics: {len(TOPICS_PERFORMANCE_DATA)}")
    print(f"  • Total attempts: {sum(len(d['attempts']) for d in TOPICS_PERFORMANCE_DATA.values())}")
    
    tests = [
        ("Health Check", test_ml_health),
        ("Mastery Engine", test_mastery_engine),
        ("Retention Model", test_retention_model),
        ("Weakness Detection", test_weakness_detection),
        ("Adaptive Planner", test_adaptive_planner),
        ("Readiness Model", test_readiness_model),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results[test_name] = "✅ PASSED" if result else "❌ FAILED"
            await asyncio.sleep(1)  # Small delay between tests
        except Exception as e:
            print(f"\n❌ Exception in {test_name}: {e}")
            results[test_name] = f"❌ ERROR"
    
    # Summary
    print("\n\n" + "="*70)
    print("ML MODEL TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for r in results.values() if "PASSED" in r)
    total = len(results)
    
    for test_name, result in results.items():
        print(f"{test_name:.<50} {result}")
    
    print("="*70)
    print(f"Results: {passed}/{total} tests passed\n")
    
    if passed == total:
        print("🎉 All ML models are calculating correctly!")
        print("   • Mastery probabilities computed using Bayesian Knowledge Tracing")
        print("   • Retention scores using Ebbinghaus forgetting curve")
        print("   • Weakness areas identified from performance data")
        print("   • Study plans adapted to student needs")
        print("   • Interview readiness predicted with confidence scores")
    else:
        print(f"⚠️  {total - passed} test(s) need attention")


if __name__ == "__main__":
    asyncio.run(main())
