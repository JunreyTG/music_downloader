import uvicorn
import socket
import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, backend_dir)

def get_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.0.47"

if __name__ == "__main__":
    lan_ip = get_lan_ip()
    port = 8000

    print("=" * 70)
    print("  MSEEK MUSIC - LOCAL WI-FI DOWNLOAD & STREAMING PORTAL")
    print("=" * 70)
    print(f"  [PC / Localhost]:")
    print(f"    http://localhost:{port}/download")
    print()
    print(f"  [Mobile Phone (Connect to Same Wi-Fi)]: ")
    print(f"    http://{lan_ip}:{port}/download")
    print()
    print(f"  [Direct APK Download Link]:")
    print(f"    http://{lan_ip}:{port}/download/mseek.apk")
    print()
    print(f"  [API Documentation]:")
    print(f"    http://localhost:{port}/docs")
    print("=" * 70)
    print("  Server is listening on 0.0.0.0:8000...")
    print("=" * 70)

    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True, app_dir=backend_dir)
