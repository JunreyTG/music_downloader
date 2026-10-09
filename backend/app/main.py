from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import music, download, portal

app = FastAPI(
    title="Mseek Music API",
    description="Backend microservice for Mseek mobile music downloader & player",
    version="1.0.0"
)

# Enable CORS for mobile development & Web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portal.router)
app.include_router(music.router)
app.include_router(download.router)

@app.get("/")
def root(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        return portal.portal_page(request)
    return {
        "app": "Mseek Music API",
        "status": "online",
        "portal": "/download",
        "docs": "/docs",
        "endpoints": [
            "/download",
            "/api/music/new-releases",
            "/api/music/trending",
            "/api/music/search?q={query}",
            "/api/music/stream/{videoId}",
            "/api/music/download/{videoId}"
        ]
    }

@app.get("/api/health")
def health():
    return {"status": "healthy"}
