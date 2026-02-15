"""
AI Services Startup Script with Environment Validation
Handles environment setup and robust error recovery
"""
import os
import sys
import subprocess
from pathlib import Path

def print_header(message):
    print("\n" + "="*70)
    print(f"🚀 {message}")
    print("="*70 + "\n")

def check_python_version():
    """Verify Python 3.8+"""
    if sys.version_info < (3, 8):
        print("❌ ERROR: Python 3.8+ required")
        print(f"   Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def clean_cache():
    """Clean Python cache directories"""
    print_header("Cleaning Python Cache")
    
    patterns = ['__pycache__', '*.pyc', '*.pyo', '*.egg-info', '.pytest_cache', '.coverage']
    cleaned = 0
    
    for pattern in patterns:
        if '*' in pattern:
            for item in Path('.').rglob(pattern.replace('*', '')):
                try:
                    if item.is_file():
                        item.unlink()
                        cleaned += 1
                except:
                    pass
        else:
            for item in Path('.').rglob(pattern):
                try:
                    if item.is_dir():
                        import shutil
                        shutil.rmtree(item)
                        cleaned += 1
                except:
                    pass
    
    print(f"✅ Cleaned {cleaned} cache items")

def upgrade_pip():
    """Upgrade pip, setuptools, wheel"""
    print_header("Upgrading pip and build tools")
    
    try:
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', 
            '--upgrade', 'pip', 'setuptools', 'wheel'
        ])
        print("✅ Build tools upgraded")
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Warning: pip upgrade partially failed: {e}")
        print("   Continuing anyway...")

def install_dependencies():
    """Install required packages from requirements.txt"""
    print_header("Installing Dependencies")
    
    req_file = Path('requirements.txt')
    if not req_file.exists():
        print("❌ ERROR: requirements.txt not found")
        sys.exit(1)
    
    try:
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install',
            '--no-cache-dir', '-r', 'requirements.txt'
        ])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ ERROR: Failed to install dependencies")
        print(f"   {e}")
        sys.exit(1)

def verify_imports():
    """Verify all critical imports work"""
    print_header("Verifying Imports")
    
    critical_modules = [
        ('fastapi', 'FastAPI'),
        ('uvicorn', 'Uvicorn'),
        ('motor', 'Motor (async MongoDB)'),
        ('google.generativeai', 'Google Generative AI'),
        ('dotenv', 'python-dotenv'),
        ('numpy', 'NumPy'),
        ('sklearn', 'scikit-learn'),
    ]
    
    failed = []
    
    for module_name, display_name in critical_modules:
        try:
            __import__(module_name)
            print(f"  ✅ {display_name}")
        except ImportError as e:
            print(f"  ❌ {display_name}: {e}")
            failed.append((module_name, display_name))
    
    if failed:
        print(f"\n❌ {len(failed)} imports failed:")
        for mod, display in failed:
            print(f"   - {display} ({mod})")
        print("\nTrying to fix...")
        
        for mod, _ in failed:
            try:
                subprocess.check_call([
                    sys.executable, '-m', 'pip', 'install',
                    '--no-cache-dir', '--force-reinstall', mod
                ])
            except:
                pass
        
        print("\nPlease try again after fix.")
        sys.exit(1)
    
    print("\n✅ All critical imports successful!")

def check_env_file():
    """Verify .env file exists"""
    print_header("Checking Configuration")
    
    env_file = Path('.env')
    if not env_file.exists():
        print("⚠️  WARNING: .env file not found")
        print("   Creating from .env.example...")
        
        example_file = Path('.env.example')
        if example_file.exists():
            env_file.write_text(example_file.read_text())
            print("✅ .env created from .env.example")
        else:
            print("❌ ERROR: .env.example not found")
            sys.exit(1)
    else:
        print("✅ .env configuration found")

def load_env_variables():
    """Load and validate environment variables"""
    from dotenv import load_dotenv
    
    load_dotenv()
    
    required_vars = {
        'MONGO_URI': 'mongodb://localhost:27017/prepmate-ai-studio',
        'GEMINI_API_KEY': 'Not set (optional for startup)',
        'AI_SERVICE_PORT': '8000',
    }
    
    print("\n📋 Environment Variables:")
    for var, default in required_vars.items():
        value = os.getenv(var)
        if value:
            masked = value[:10] + '...' if len(value) > 10 else value
            print(f"  ✅ {var} = {masked}")
        else:
            print(f"  ⚠️  {var} = {default}")

def initialize_models():
    """Initialize ML models directory and create dummy models"""
    print_header("Initializing ML Models")
    
    models_dir = Path('./models')
    models_dir.mkdir(exist_ok=True)
    print(f"✅ Models directory: {models_dir.absolute()}")
    
    try:
        import numpy as np
        from sklearn.linear_model import LinearRegression
        import pickle
        
        # Create dummy models
        model_names = [
            ('readiness_xgboost', 'Readiness Prediction'),
            ('mastery_calibration', 'Mastery Calibration'),
            ('retention_tuning', 'Retention Tuning'),
        ]
        
        for model_name, display_name in model_names:
            model_path = models_dir / f"{model_name}.pkl"
            
            if model_path.exists():
                print(f"  ✅ {display_name} (already exists)")
            else:
                # Create simple fallback model
                X_dummy = np.random.randn(100, 7 if 'readiness' in model_name else 5)
                y_dummy = np.random.rand(100)
                model = LinearRegression()
                model.fit(X_dummy, y_dummy)
                
                with open(model_path, 'wb') as f:
                    pickle.dump(model, f)
                
                print(f"  ✅ {display_name} (created)")
        
        print("\n✅ ML Models initialized successfully")
    
    except Exception as e:
        print(f"⚠️  Warning: Could not initialize ML models: {e}")
        print("   Models will be created at runtime")


def main():
    """Main startup sequence"""
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*15 + "AI SERVICES ENVIRONMENT SETUP" + " "*25 + "║")
    print("╚" + "="*68 + "╝")
    
    # Step-by-step setup
    check_python_version()
    clean_cache()
    upgrade_pip()
    install_dependencies()
    verify_imports()
    check_env_file()
    load_env_variables()
    initialize_models()
    
    # Final message
    print("\n" + "="*70)
    print("🎉 ENVIRONMENT READY!")
    print("="*70)
    print("\nTo start the AI service, run one of these commands:\n")
    print("  Option 1 (Development):")
    print("    python main.py")
    print("\n  Option 2 (Production):")
    print("    uvicorn main:app --host 0.0.0.0 --port 8000")
    print("\n  Option 3 (Auto-reload):")
    print("    uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    print("\n" + "="*70)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
