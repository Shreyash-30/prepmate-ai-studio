#!/usr/bin/env python3
"""
Complete Diagnostic Report for Question Generation Feature
Tests all components of the system
"""
import asyncio
import aiohttp
import json
import subprocess
import sys
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment
env_path = Path(__file__).parent / 'ai-services' / '.env'
env_path.exists() and load_dotenv(env_path, override=True)

def check_service_running(port, service_name):
    """Check if a service is running on a port"""
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        return result == 0
    except:
        return False

async def test_ai_service():
    """Test the Python AI service"""
    print("\n" + "=" * 70)
    print("1️⃣  TESTING AI SERVICE (Python, Port 8001)")
    print("=" * 70)
    
    running = check_service_running(8001, "AI Service")
    print(f"Status: {'✅ Running' if running else '❌ NOT Running'}")
    
    if not running:
        print("Fix: cd ai-services && python main.py")
        return False
    
    # Test API
    url = "http://localhost:8001/ai/practice/generate-questions"
    payload = {
        "learnerProfile": {
            "topicId": "arrays",
            "learningLevel": "beginner",
            "masteryScore": 0.5,
            "progressionReadinessScore": 0.6
        },
        "limit": 2
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                data = await resp.json()
                success = data.get('success')
                print(f"API Response: {'✅ Success' if success else '❌ Failed'}")
                print(f"Questions: {len(data.get('questions', []))} generated")
                print(f"Source: {data.get('source', 'unknown')}")
                if data.get('error'):
                    print(f"Error: {data.get('error')}")
                return success
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

async def test_backend():
    """Test the Node.js backend"""
    print("\n" + "=" * 70)
    print("2️⃣  TESTING BACKEND (Node.js, Port 8000)")
    print("=" * 70)
    
    running = check_service_running(8000, "Backend")
    print(f"Status: {'✅ Running' if running else '❌ NOT Running'}")
    
    if not running:
        print("Fix: cd backend && npm start")
        return False
    
    print("✅ Backend is running")
    return True

def check_env_config():
    """Check environment configuration"""
    print("\n" + "=" * 70)
    print("3️⃣  CHECKING ENVIRONMENT CONFIGURATION")
    print("=" * 70)
    
    gemini_key = os.getenv('GEMINI_API_KEY')
    groq_key = os.getenv('GROQ_API_KEY')
    
    print(f"GEMINI_API_KEY: {'✅ Set' if gemini_key else '❌ Not set'}")
    print(f"GROQ_API_KEY: {'✅ Set' if groq_key else '❌ Not set'}")
    
    if not groq_key:
        print("\n⚠️ Groq API key not set! Fallback provider will not work.")
        print("Get a free key from: https://console.groq.com")
        return False
    
    return True

async def run_diagnostics():
    """Run complete diagnostics"""
    print("\n" + "🔍 " * 20)
    print("QUESTION GENERATION FEATURE - COMPLETE DIAGNOSTIC REPORT")
    print("🔍 " * 20)
    
    # Check services
    ai_ok = await test_ai_service()
    backend_ok = await test_backend()
    env_ok = check_env_config()
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    
    all_ok = ai_ok and backend_ok and env_ok
    
    if all_ok:
        print("✅ All components are working!")
        print("\nNext steps:")
        print("1. Open browser to http://localhost:5173")
        print("2. Login to PrepMate")
        print("3. Go to Practice page")
        print("4. Click on a topic to generate questions")
        print("5. Open DevTools Console to see detailed logs")
        print("\nExpected behavior:")
        print("- Console shows detailed generation logs")
        print("- Questions appear as cards below the topic")
        print("- Debug panel shows state transitions (if enabled)")
    else:
        print("❌ Some components are not working. Please fix above issues.")
        print("\nServices to check:")
        print(f"  AI Service (8001): {'✅ OK' if ai_ok else '❌ Not running'}")
        print(f"  Backend (8000): {'✅ OK' if backend_ok else '❌ Not running'}")
        print(f"  Environment: {'✅ OK' if env_ok else '❌ Config missing'}")
    
    return all_ok

if __name__ == "__main__":
    try:
        result = asyncio.run(run_diagnostics())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\nDiagnostics cancelled.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Diagnostics error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
