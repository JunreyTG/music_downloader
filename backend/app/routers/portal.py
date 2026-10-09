from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
import os
import socket

router = APIRouter(tags=["Portal"])

def get_lan_ip() -> str:
    """Detect primary LAN IPv4 address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        # Doesn't need to actually connect, just resolves the outbound interface
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.0.47"

def find_apk_path() -> tuple[str | None, str | None]:
    """Find available compiled APK file."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    candidates = [
        os.path.join(base_dir, "app", "storage", "downloads", "Mseek.apk"),
        os.path.join(os.path.dirname(base_dir), "mobile", "android", "build_all", "app", "outputs", "apk", "debug", "app-debug.apk"),
        os.path.join(os.path.dirname(base_dir), "mobile", "android", "build_all", "app", "outputs", "apk", "release", "app-release.apk"),
        os.path.join(os.path.dirname(base_dir), "mobile", "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
        os.path.join(os.path.dirname(base_dir), "mobile", "android", "app", "build", "outputs", "apk", "release", "app-release.apk"),
    ]
    for path in candidates:
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            return path, "Mseek-Music-v1.0.apk"
    return None, None

@router.get("/download", response_class=HTMLResponse)
@router.get("/portal", response_class=HTMLResponse)
def portal_page(request: Request):
    lan_ip = get_lan_ip()
    port = request.url.port or 8000
    lan_url = f"http://{lan_ip}:{port}/download"
    web_app_url = f"http://{lan_ip}:8081"
    apk_path, _ = find_apk_path()
    apk_ready = apk_path is not None
    apk_size_mb = f"{os.path.getsize(apk_path) / (1024 * 1024):.1f} MB" if apk_ready else "Building..."

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mseek Music - Local Wi-Fi Download Portal</title>
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }}
    body {{
      background: #000000;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
    }}
    .container {{
      max-width: 520px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }}
    .header {{
      text-align: center;
      padding: 20px 0 10px;
    }}
    .logo-badge {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 54px;
      height: 54px;
      background: #ffffff;
      color: #000000;
      border-radius: 50%;
      font-size: 26px;
      margin-bottom: 12px;
      font-weight: 900;
    }}
    .app-title {{
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }}
    .tagline {{
      font-size: 14px;
      color: #a3a3a3;
      line-height: 1.4;
    }}
    .network-pill {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #141414;
      border: 1px solid #262626;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      color: #22c55e;
      margin-top: 14px;
      font-weight: 600;
    }}
    .card {{
      background: #0d0d0d;
      border: 1px solid #262626;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }}
    .card-title {{
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .btn {{
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 16px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      transition: all 0.15s ease;
      cursor: pointer;
      border: none;
    }}
    .btn-primary {{
      background: #ffffff;
      color: #000000;
    }}
    .btn-primary:hover {{
      background: #e5e5e5;
    }}
    .btn-secondary {{
      background: #1a1a1a;
      color: #ffffff;
      border: 1px solid #333333;
    }}
    .btn-secondary:hover {{
      background: #262626;
    }}
    .meta-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      font-size: 12px;
      color: #888888;
      border-top: 1px solid #1a1a1a;
      padding-top: 12px;
    }}
    .meta-item strong {{
      color: #ffffff;
      display: block;
      margin-bottom: 2px;
    }}
    .qr-container {{
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
    }}
    .qr-box {{
      background: #ffffff;
      padding: 14px;
      border-radius: 8px;
      display: inline-block;
    }}
    .qr-image {{
      width: 180px;
      height: 180px;
      display: block;
    }}
    .qr-caption {{
      font-size: 12px;
      color: #a3a3a3;
      text-align: center;
    }}
    .guide-step {{
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: #cccccc;
      line-height: 1.4;
    }}
    .step-number {{
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #222222;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }}
    .badge-status {{
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      background: {"#15803d" if apk_ready else "#854d0e"};
      color: #ffffff;
      margin-left: auto;
    }}
    .footer {{
      text-align: center;
      font-size: 11px;
      color: #555555;
      padding: 16px 0;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">&#9835;</div>
      <h1 class="app-title">Mseek Music</h1>
      <p class="tagline">VidMate-Style Mobile Music Downloader & Player<br>100% Offline Playback & Stream Caching</p>
      <div class="network-pill">
        <span>&#9679;</span> Connected on Wi-Fi: <strong>{lan_ip}</strong>
      </div>
    </div>

    <!-- Direct APK Download Card -->
    <div class="card">
      <div class="card-title">
        <span>&#128241; Android Application Package</span>
        <span class="badge-status">{"READY TO INSTALL" if apk_ready else "BUILDING IN PROGRESS"}</span>
      </div>

      <p style="font-size: 13px; color: #a3a3a3; line-height: 1.4;">
        Download the standalone Android APK directly to your phone over the local Wi-Fi. Does not require Google Play Store.
      </p>

      <a href="/download/mseek.apk" class="btn btn-primary" download>
        <span>&#11015;&#65039;</span> Download Mseek APK ({apk_size_mb})
      </a>

      <div class="meta-grid">
        <div class="meta-item">
          <strong>Package:</strong> com.mseek.music
        </div>
        <div class="meta-item">
          <strong>Version:</strong> 1.0.0 (Native)
        </div>
        <div class="meta-item">
          <strong>Compatibility:</strong> Android 8.0+
        </div>
        <div class="meta-item">
          <strong>Wi-Fi URL:</strong> {lan_url}
        </div>
      </div>
    </div>

    <!-- Scan to Open on Phone -->
    <div class="card">
      <div class="card-title">
        <span>&#128247; Scan with Your Phone Camera</span>
      </div>
      <div class="qr-container">
        <div class="qr-box">
          <!-- Client-side dynamic QR image using qrserver API -->
          <img
            class="qr-image"
            src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data={lan_url}"
            alt="Scan to open on Wi-Fi"
            onerror="this.style.display='none'"
          />
        </div>
        <p class="qr-caption">
          Point your phone camera at the QR code above while on the same Wi-Fi to open this download page on your phone!
        </p>
      </div>
    </div>

    <!-- Instant Web Player Alternative -->
    <div class="card">
      <div class="card-title">
        <span>&#127760; Instant In-Browser Music Player</span>
      </div>
      <p style="font-size: 13px; color: #a3a3a3; line-height: 1.4;">
        Don't want to install an APK right now? Open the live music player right inside your mobile Chrome/Safari browser!
      </p>
      <a href="{web_app_url}" class="btn btn-secondary" target="_blank">
        <span>&#9654;&#65039;</span> Open In-Browser Music Player
      </a>
    </div>

    <!-- Installation Steps -->
    <div class="card">
      <div class="card-title">
        <span>&#128221; How to Install APK on Android</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div class="guide-step">
          <div class="step-number">1</div>
          <div>Tap <strong>Download Mseek APK</strong> above to download the file to your phone.</div>
        </div>
        <div class="guide-step">
          <div class="step-number">2</div>
          <div>Once downloaded, tap the file in your notification bar or Downloads folder to open it.</div>
        </div>
        <div class="guide-step">
          <div class="step-number">3</div>
          <div>If prompted with <em>"Install unknown apps"</em>, tap <strong>Settings</strong> and switch on <strong>Allow from this source</strong>.</div>
        </div>
        <div class="guide-step">
          <div class="step-number">4</div>
          <div>Tap <strong>Install</strong>. Once finished, open <strong>Mseek</strong> and enjoy unlimited offline music!</div>
        </div>
      </div>
    </div>

    <div class="footer">
      Mseek Local Microservice &middot; Host IP: {lan_ip}:{port} &middot; Python FastAPI + Expo
    </div>
  </div>
</body>
</html>
"""
    return HTMLResponse(content=html)

@router.get("/download/mseek.apk")
def download_apk_file():
    apk_path, filename = find_apk_path()
    if not apk_path or not os.path.exists(apk_path):
        raise HTTPException(
            status_code=404,
            detail="The Android APK is currently compiling in the background. Please wait a moment and refresh!"
        )
    return FileResponse(
        path=apk_path,
        filename=filename or "Mseek-Music-v1.0.apk",
        media_type="application/vnd.android.package-archive",
        headers={"Content-Disposition": 'attachment; filename="Mseek-Music-v1.0.apk"'}
    )
