"""
Verification Script for AI Services Setup
Run: python verify_setup.py
"""
import os
import sys
import importlib.util
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def check_python_version():
    """Check if Python 3.11+ is running"""
    version = sys.version_info
    print(f"Python Version: {version.major}.{version.minor}.{version.micro}")

    if version.major < 3 or (version.major == 3 and version.minor < 11):
        print("❌ Python 3.11+ required")
        return False
    print("✅ Python version OK")
    return True


def check_env_file():
    """Check if .env file exists and has required variables"""
    if not os.path.exists(".env"):
        print("❌ .env file not found")
        print("   Create from .env.example: cp .env.example .env")
        return False

    with open(".env", "r") as f:
        content = f.read()
        if "GEMINI_API_KEY=" not in content or "GEMINI_API_KEY=\n" in content:
            print("❌ GEMINI_API_KEY not set in .env")
            return False

        if not any(
            content.startswith("GEMINI_API_KEY=sk-")
            or "GEMINI_API_KEY=AIza" in content
            for content in content.split("\n")
        ):
            # Check if key is actually set (not empty)
            key_line = [l for l in content.split("\n") if l.startswith("GEMINI_API_KEY=")]
            if key_line and len(key_line[0].split("=")[1].strip()) == 0:
                print("❌ GEMINI_API_KEY is empty in .env")
                return False

    print("✅ .env file configured")
    return True


def check_project_structure():
    """Check if required project structure exists"""
    required_paths = [
        "app/llm/gemini_client.py",
        "app/llm/prompt_templates.py",
        "app/llm/mentor_service.py",
        "app/llm/practice_review_service.py",
        "app/llm/interview_service.py",
        "app/llm/learning_service.py",
        "app/llm/routers.py",
        "schemas/schemas.py",
        "main.py",
        "requirements.txt",
    ]

    all_exist = True
    for path in required_paths:
        if not os.path.exists(path):
            print(f"❌ Missing: {path}")
            all_exist = False

    if all_exist:
        print("✅ Project structure OK")
    return all_exist


def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("google.generativeai", "google-generativeai"),
        ("pydantic", "pydantic"),
        ("motor", "motor"),
        ("pymongo", "pymongo"),
        ("dotenv", "python-dotenv"),
    ]

    missing_packages = []

    for import_name, package_name in required_packages:
        try:
            spec = importlib.util.find_spec(import_name)
            if spec is None:
                raise ImportError(f"Cannot find {import_name}")
            print(f"✅ {package_name} installed")
        except ImportError:
            print(f"❌ {package_name} NOT installed")
            missing_packages.append(package_name)

    if missing_packages:
        print(f"\nInstall missing packages with:")
        print(f"pip install {' '.join(missing_packages)}")
        return False

    print("✅ All dependencies installed")
    return True


def check_mongodb_connection():
    """Check if MongoDB is accessible"""
    try:
        from pymongo import MongoClient

        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/prepmate_ai")
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        print("✅ MongoDB connection OK")
        client.close()
        return True
    except Exception as e:
        print(f"⚠️  MongoDB connection failed: {str(e)}")
        print("   (This is OK for development, but required for production)")
        return True  # Not critical for development


def check_gemini_connection():
    """Check if Gemini API is accessible"""
    try:
        import google.generativeai as genai

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("❌ GEMINI_API_KEY not set")
            return False

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Test with a simple prompt
        response = model.generate_content(
            "Say 'OK' in exactly one word.",
            generation_config={"temperature": 0.0},
        )

        if response.text:
            print("✅ Gemini API connection OK")
            return True
        else:
            print("❌ Gemini API returned empty response")
            return False

    except Exception as e:
        print(f"❌ Gemini API connection failed: {str(e)}")
        return False


def main():
    """Run all verification checks"""
    print("=" * 60)
    print("🔍 AI SERVICES SETUP VERIFICATION")
    print("=" * 60)
    print()

    checks = [
        ("Python Version", check_python_version),
        ("Environment File", check_env_file),
        ("Project Structure", check_project_structure),
        ("Dependencies", check_dependencies),
        ("MongoDB Connection", check_mongodb_connection),
        ("Gemini API", check_gemini_connection),
    ]

    results = []
    for name, check_fn in checks:
        print(f"\n📋 Checking {name}...")
        try:
            result = check_fn()
            results.append((name, result))
        except Exception as e:
            print(f"❌ {name} check failed: {str(e)}")
            results.append((name, False))

    # Summary
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)

    all_passed = True
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
        if not result:
            all_passed = False

    print()
    if all_passed:
        print("✨ All checks passed! Ready to start AI Services.")
        print("\nRun: python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
        return 0
    else:
        print("⚠️  Some checks failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
