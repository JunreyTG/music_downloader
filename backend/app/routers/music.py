from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional, Dict, Any
from app.services.youtube_service import (
    get_new_releases,
    get_trending,
    search_music,
    get_album_tracks,
    get_stream_url,
    get_track_info
)

router = APIRouter(prefix="/api/music", tags=["Music"])

@router.get("/new-releases")
def api_new_releases():
    """Fetch all new release music albums and singles."""
    return get_new_releases()

@router.get("/trending")
def api_trending():
    """Fetch current trending music tracks."""
    return get_trending()

@router.get("/search")
def api_search(
    q: str = Query(..., description="Search query string"),
    filter: str = Query("songs", description="Search filter: songs, videos, albums"),
    limit: int = Query(25, ge=1, le=50)
):
    """Search music on YouTube."""
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty")
    return search_music(query=q.strip(), filter_type=filter, limit=limit)

@router.get("/album/{browse_id}")
def api_album(browse_id: str):
    """Get album tracklist for new releases."""
    data = get_album_tracks(browse_id)
    if not data or not data.get("tracks"):
        raise HTTPException(status_code=404, detail="Album tracks not found")
    return data

@router.get("/stream/{video_id}")
def api_stream(video_id: str, format: Optional[str] = Query("mp3")):
    """Extract direct progressive audio stream URL."""
    try:
        data = get_stream_url(video_id, format_pref=format or "mp3")
        if not data or not data.get("stream_url"):
            raise HTTPException(status_code=404, detail="Could not extract stream URL")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/info/{video_id}")
def api_info(video_id: str):
    """Fetch track details, lyrics, and related tracks."""
    try:
        data = get_track_info(video_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
