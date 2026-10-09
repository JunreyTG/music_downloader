import uvicorn
import sys
import os

# Add parent directory to sys.path so 'app' module is resolved correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    is_dev = os.environ.get("ENVIRONMENT", "production").lower() == "development"
    print("=" * 60)
    print(f"  Starting Mseek Backend Microservice on http://{host}:{port}")
    print(f"  API Docs available at: http://localhost:{port}/docs")
    print("=" * 60)
    uvicorn.run("app.main:app", host=host, port=port, reload=is_dev)
