from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
import os
from app.services.youtube_service import download_audio_file

router = APIRouter(prefix="/api/music", tags=["Download"])

@router.get("/download/{video_id}")
def api_download(video_id: str, format: str = Query("mp3")):
    """Download audio file and return as direct attachment (mp3 or mp4/m4a)."""
    try:
        file_info = download_audio_file(video_id, format_type=format)
        if not file_info or not os.path.exists(file_info["filepath"]):
            raise HTTPException(status_code=500, detail="Failed to process audio download")

        return FileResponse(
            path=file_info["filepath"],
            filename=file_info["filename"],
            media_type=file_info["mime"],
            headers={"Content-Disposition": f'attachment; filename="{file_info["filename"]}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
