"""Quick test to check if AI service is running"""
import httpx
import json

try:
    with httpx.Client() as client:
        # Test root endpoint
        print("Testing root endpoint: http://localhost:8001/")
        response = client.get("http://localhost:8001/", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Test health check
        print("\nTesting health endpoint: http://localhost:8001/ai/health")
        response = client.get("http://localhost:8001/ai/health", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # List available routes
        print("\nTesting docs endpoint to see available routes:")
        response = client.get("http://localhost:8001/docs", timeout=5)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Swagger UI available at http://localhost:8001/docs")
        
except Exception as e:
    print(f"❌ Cannot connect to AI service: {e}")
    print("\nMake sure the AI service is running:")
    print("  cd c:\\Projects\\prepmate-ai-studio\\ai-services")
    print("  python main.py")
