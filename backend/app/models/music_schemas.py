from pydantic import BaseModel
from typing import List, Optional

class Artist(BaseModel):
    name: str
    id: Optional[str] = None

class Track(BaseModel):
    id: str
    title: str
    artists: List[str]
    album: Optional[str] = None
    duration: Optional[str] = "0:00"
    duration_seconds: Optional[int] = 0
    thumbnail: Optional[str] = None
    views: Optional[str] = None
    is_explicit: Optional[bool] = False

class ReleaseItem(BaseModel):
    id: str
    title: str
    type: str  # Album, Single
    artists: List[str]
    thumbnail: Optional[str] = None
    year: Optional[str] = None
    playlist_id: Optional[str] = None

class StreamResponse(BaseModel):
    id: str
    title: str
    stream_url: str
    duration: Optional[int] = 0
    thumbnail: Optional[str] = None
    artists: Optional[List[str]] = []
