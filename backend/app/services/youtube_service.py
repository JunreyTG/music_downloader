import os
import re
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from ytmusicapi import YTMusic
import yt_dlp
from app.services.cache_service import memory_cache

ytmusic = YTMusic()

DOWNLOADS_TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "downloads")
os.makedirs(DOWNLOADS_TEMP_DIR, exist_ok=True)

def _clean_title(title: str) -> str:
    """Sanitize title for file system."""
    return re.sub(r'[\\/*?:"<>|]', "", title).strip()

def _extract_year(item: Dict[str, Any], fallback_year: Optional[str] = None) -> str:
    """Extract release or upload year from item metadata, subtitle, runs, or title."""
    if item.get("year"):
        return str(item.get("year"))
    if item.get("upload_date"):
        return str(item.get("upload_date"))[:4]

    # Check subtitles / runs
    subtitles = item.get("subtitles") or []
    if isinstance(subtitles, list):
        for sub in subtitles:
            text = sub.get("text", "") if isinstance(sub, dict) else str(sub)
            match = re.search(r'\b(19\d\d|20[0-2]\d)\b', text)
            if match:
                return match.group(1)
    elif isinstance(subtitles, str):
        match = re.search(r'\b(19\d\d|20[0-2]\d)\b', subtitles)
        if match:
            return match.group(1)

    title = str(item.get("title", "")) + " " + str(item.get("album", ""))
    match = re.search(r'\b(19\d\d|20[0-2]\d)\b', title)
    if match:
        return match.group(1)

    if fallback_year:
        return str(fallback_year)
    return str(datetime.now().year)

def _upgrade_to_720p(url: Optional[str]) -> Optional[str]:
    """Upgrade Google User Content or YouTube thumbnail to 720p HD resolution."""
    if not url:
        return None
    # 1. Google user content scaling (e.g. =w60-h60-l90-rj, =w544-h544-l90-rj, =s544)
    if "googleusercontent.com" in url:
        url = re.sub(r'=w\d+-h\d+.*', '=w720-h720-l90-rj', url)
        url = re.sub(r'=s\d+.*', '=s720-c', url)
        return url
    # 2. YouTube vi thumbnails (upgrade default, hqdefault, mqdefault, sddefault to hq720)
    if "i.ytimg.com/vi/" in url:
        return re.sub(r'/(default|mqdefault|hqdefault|sddefault)\.jpg', '/hq720.jpg', url)
    return url

def _get_best_thumbnail(thumbnails: Optional[List[Dict[str, Any]]]) -> Optional[str]:
    if not thumbnails:
        return None
    # Pick the highest resolution thumbnail (usually the last in the list) and upgrade to 720p
    url = thumbnails[-1].get("url")
    return _upgrade_to_720p(url)

def get_new_releases() -> List[Dict[str, Any]]:
    """Fetch new releases from YouTube Music explore section along with curated multi-year albums."""
    cache_key = "explore:new_releases:v2"
    cached = memory_cache.get(cache_key)
    if cached is not None:
        return cached

    formatted: List[Dict[str, Any]] = []
    seen_ids = set()

    # 1. Fetch current explore new releases
    try:
        explore = ytmusic.get_explore()
        raw_releases = explore.get("new_releases", [])
        for item in raw_releases:
            b_id = item.get("browseId", "")
            if not b_id or b_id in seen_ids:
                continue
            seen_ids.add(b_id)
            artists = [a.get("name") for a in item.get("artists", []) if a.get("name")]
            thumb = _get_best_thumbnail(item.get("thumbnails"))
            formatted.append({
                "id": b_id,
                "playlist_id": item.get("audioPlaylistId", ""),
                "title": item.get("title", "Unknown Title"),
                "type": item.get("type", "Single"),
                "artists": artists or ["Unknown Artist"],
                "thumbnail": thumb,
                "is_explicit": item.get("isExplicit", False),
                "year": str(item.get("year")) if item.get("year") else str(datetime.now().year)
            })
    except Exception as e:
        print(f"Error fetching new releases from explore: {e}")

    # 2. Enrich with iconic albums from diverse release years (2025, 2024, 2023, 2020s, 2010s)
    year_queries = [
        ("top albums 2025", "2025"),
        ("top albums 2024", "2024"),
        ("top albums 2023", "2023"),
        ("classic hit albums 2020", "2020"),
        ("iconic albums 2010s", "2015"),
    ]
    for q, yr in year_queries:
        try:
            alb_results = ytmusic.search(q, filter="albums")
            for item in alb_results[:5]:
                b_id = item.get("browseId", "")
                if not b_id or b_id in seen_ids:
                    continue
                seen_ids.add(b_id)
                artists = [a.get("name") for a in item.get("artists", []) if a.get("name")]
                thumb = _get_best_thumbnail(item.get("thumbnails"))
                album_year = str(item.get("year")) if item.get("year") else yr
                formatted.append({
                    "id": b_id,
                    "playlist_id": item.get("playlistId", ""),
                    "title": item.get("title", "Unknown Album"),
                    "type": item.get("type", "Album"),
                    "artists": artists or ["Various Artists"],
                    "thumbnail": thumb,
                    "is_explicit": item.get("isExplicit", False),
                    "year": album_year
                })
        except Exception as err:
            print(f"Error fetching multi-year albums for {q}: {err}")

    memory_cache.set(cache_key, formatted, ttl_seconds=1800)
    return formatted

def get_trending() -> List[Dict[str, Any]]:
    """Fetch current trending tracks combined with hit songs from multiple years (2025, 2024, 2023, 2020s, classics)."""
    cache_key = "explore:trending:v2"
    cached = memory_cache.get(cache_key)
    if cached is not None:
        return cached

    formatted: List[Dict[str, Any]] = []
    seen_ids = set()

    # 1. Fetch current trending tracks
    try:
        explore = ytmusic.get_explore()
        raw_trending = explore.get("trending", {}).get("items", [])
        if not raw_trending and "trending" in explore and isinstance(explore["trending"], list):
            raw_trending = explore["trending"]

        for item in raw_trending:
            video_id = item.get("videoId")
            if not video_id or video_id in seen_ids:
                continue
            seen_ids.add(video_id)
            artists = [a.get("name") for a in item.get("artists", []) if a.get("name")]
            thumb = _get_best_thumbnail(item.get("thumbnails"))
            formatted.append({
                "id": video_id,
                "title": item.get("title", "Unknown Title"),
                "artists": artists or ["Unknown Artist"],
                "album": item.get("album", {}).get("name") if item.get("album") else None,
                "duration": item.get("duration", "0:00"),
                "thumbnail": thumb,
                "views": item.get("views"),
                "year": _extract_year(item, fallback_year=str(datetime.now().year))
            })
    except Exception as e:
        print(f"Error fetching trending from explore: {e}")

    # 2. Enrich with songs from distinct release years
    curated_year_searches = [
        ("billboard hits 2025", "2025"),
        ("billboard hot 100 2024", "2024"),
        ("top hits 2023", "2023"),
        ("top hits 2022", "2022"),
        ("billboard hits 2020", "2020"),
        ("greatest hits 2010s", "2015"),
    ]

    for q, yr in curated_year_searches:
        try:
            year_tracks = search_music(q, filter_type="songs", limit=6, fallback_year=yr)
            for t in year_tracks:
                if t["id"] not in seen_ids:
                    seen_ids.add(t["id"])
                    formatted.append(t)
        except Exception as e:
            print(f"Error fetching tracks for {q}: {e}")

    # Fallback if trending was empty
    if not formatted:
        formatted = search_music("trending music", limit=25)

    memory_cache.set(cache_key, formatted, ttl_seconds=1800)
    return formatted

def search_music(query: str, filter_type: str = "songs", limit: int = 25, fallback_year: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search YouTube Music tracks with optional fallback year inference."""
    cache_key = f"search:{query}:{filter_type}:{limit}:{fallback_year}"
    cached = memory_cache.get(cache_key)
    if cached is not None:
        return cached

    # Check if query itself mentions a 4-digit year (e.g. 2024, 2023, 2020, 2015)
    query_year_match = re.search(r'\b(19\d\d|20[0-2]\d)\b', query)
    inferred_year = query_year_match.group(1) if query_year_match else fallback_year

    try:
        results = ytmusic.search(query, filter=filter_type)
        formatted = []
        for item in results[:limit]:
            video_id = item.get("videoId")
            if not video_id:
                continue

            artists = [a.get("name") for a in item.get("artists", []) if a.get("name")]
            thumb = _get_best_thumbnail(item.get("thumbnails"))
            if not thumb:
                thumb = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

            album_name = item.get("album", {}).get("name") if item.get("album") else None
            year_val = _extract_year(item, fallback_year=inferred_year)

            formatted.append({
                "id": video_id,
                "title": item.get("title", "Unknown Title"),
                "artists": artists or ["Unknown Artist"],
                "album": album_name,
                "duration": item.get("duration", "0:00"),
                "duration_seconds": item.get("duration_seconds", 0),
                "thumbnail": thumb,
                "views": item.get("views"),
                "is_explicit": item.get("isExplicit", False),
                "year": year_val
            })
        memory_cache.set(cache_key, formatted, ttl_seconds=600)
        return formatted
    except Exception as e:
        print(f"Error searching music for query '{query}': {e}")
        return []

def get_album_tracks(browse_id: str) -> Dict[str, Any]:
    """Get album or single release track details."""
    cache_key = f"album:{browse_id}"
    cached = memory_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        album_data = ytmusic.get_album(browse_id)
        album_year = str(album_data.get("year")) if album_data.get("year") else str(datetime.now().year)
        tracks = []
        for t in album_data.get("tracks", []):
            video_id = t.get("videoId")
            if not video_id:
                continue
            artists = [a.get("name") for a in t.get("artists", []) if a.get("name")]
            thumb = _get_best_thumbnail(album_data.get("thumbnails"))
            if not thumb:
                thumb = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
            tracks.append({
                "id": video_id,
                "title": t.get("title", "Unknown Title"),
                "artists": artists or [a.get("name") for a in album_data.get("artists", [])],
                "album": album_data.get("title"),
                "duration": t.get("duration", "0:00"),
                "duration_seconds": t.get("duration_seconds", 0),
                "thumbnail": thumb,
                "track_number": t.get("trackNumber", 1),
                "year": album_year
            })
        res = {
            "title": album_data.get("title"),
            "artists": [a.get("name") for a in album_data.get("artists", [])],
            "year": album_year,
            "thumbnail": _get_best_thumbnail(album_data.get("thumbnails")),
            "tracks": tracks
        }
        memory_cache.set(cache_key, res, ttl_seconds=3600)
        return res
    except Exception as e:
        print(f"Error fetching album {browse_id}: {e}")
        return {"title": "Unknown", "tracks": []}

def _apply_env_options(ydl_opts: Dict[str, Any]) -> None:
    """Optionally apply proxy and cookiefile from environment variables for production deployments."""
    cookiefile = os.environ.get("YTDLP_COOKIEFILE")
    if cookiefile and os.path.exists(cookiefile):
        ydl_opts['cookiefile'] = cookiefile
    proxy = os.environ.get("PROXY_URL") or os.environ.get("HTTP_PROXY") or os.environ.get("HTTPS_PROXY")
    if proxy:
        ydl_opts['proxy'] = proxy

def get_stream_url(video_id: str, format_pref: str = "mp3") -> Dict[str, Any]:
    """Extract direct progressive audio stream URL using yt-dlp with highest audio quality."""
    cache_key = f"stream:{video_id}:{format_pref}"
    cached = memory_cache.get(cache_key)
    if cached is not None:
        return cached

    # Select high fidelity audio stream (AAC/M4A 256k or highest available audio bitrate)
    if format_pref in ["mp4", "m4a"]:
        fmt_spec = 'bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio/best'
    else:
        fmt_spec = 'bestaudio[ext=m4a]/bestaudio/best'

    ydl_opts = {
        'format': fmt_spec,
        'format_sort': ['abr', 'quality', 'res'],
        'extractor_args': {'youtube': {'player_client': ['android', 'ios']}},
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
    }
    _apply_env_options(ydl_opts)
    
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=False)
        stream_url = info.get("url")
        title = info.get("title", "Audio Stream")
        duration = info.get("duration", 0)
        upload_date = info.get("upload_date")
        release_year = info.get("release_year")
        year = str(release_year) if release_year else (str(upload_date)[:4] if upload_date else str(datetime.now().year))
        thumbnail = info.get("thumbnail") or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        artists = [info.get("uploader", "Unknown Artist")] if info.get("uploader") else []

        result = {
            "id": video_id,
            "title": title,
            "stream_url": stream_url,
            "duration": duration,
            "duration_seconds": duration,
            "thumbnail": thumbnail,
            "artists": artists,
            "year": year,
            "format": format_pref
        }
        # Cache for 2 hours (YouTube stream URLs have expiring signatures after ~4-6 hours)
        memory_cache.set(cache_key, result, ttl_seconds=7200)
        return result

def download_audio_file(video_id: str, format_type: str = "mp3") -> Optional[Dict[str, str]]:
    """Download audio and return the local file path and filename with format choice (mp3 or mp4/m4a)."""
    if format_type in ["mp4", "m4a"]:
        target_ext = "m4a"
        target_mime = "audio/mp4"
        fmt_spec = "bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio/best"
    else:
        target_ext = "mp3"
        target_mime = "audio/mpeg"
        fmt_spec = "bestaudio[ext=mp3]/bestaudio[ext=m4a]/bestaudio/best"

    out_template = os.path.join(DOWNLOADS_TEMP_DIR, f"{video_id}.%(ext)s")
    target_path = os.path.join(DOWNLOADS_TEMP_DIR, f"{video_id}.{target_ext}")

    if os.path.exists(target_path):
        return {"filepath": target_path, "filename": f"{video_id}.{target_ext}", "mime": target_mime}

    ydl_opts = {
        'format': fmt_spec,
        'format_sort': ['abr', 'quality'],
        'extractor_args': {'youtube': {'player_client': ['android', 'ios']}},
        'outtmpl': out_template,
        'quiet': True,
        'no_warnings': True,
    }
    _apply_env_options(ydl_opts)

    video_url = f"https://www.youtube.com/watch?v={video_id}"
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=True)
        title = _clean_title(info.get("title", video_id))
        
        # Determine written file
        for ext in [target_ext, "m4a", "mp3", "webm", "opus", "mp4"]:
            candidate = os.path.join(DOWNLOADS_TEMP_DIR, f"{video_id}.{ext}")
            if os.path.exists(candidate):
                mime = "audio/mpeg" if ext == "mp3" else ("audio/mp4" if ext in ["m4a", "mp4"] else f"audio/{ext}")
                return {"filepath": candidate, "filename": f"{title}.{ext}", "mime": mime}

    return None

def get_track_info(video_id: str) -> Dict[str, Any]:
    """Fetch track details, lyrics, and related tracks."""
    cache_key = f"info:{video_id}"
    cached = memory_cache.get(cache_key)
    if cached is not None:
        return cached

    info: Dict[str, Any] = {
        "id": video_id,
        "title": "Unknown Title",
        "artists": [],
        "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        "lyrics": None,
        "related": []
    }

    try:
        watch_data = ytmusic.get_watch_playlist(videoId=video_id)
        if watch_data:
            tracks = watch_data.get("tracks", [])
            if tracks:
                current = tracks[0]
                info["title"] = current.get("title", info["title"])
                info["artists"] = [a.get("name") for a in current.get("artists", []) if a.get("name")]
                info["thumbnail"] = _get_best_thumbnail(current.get("thumbnail")) or info["thumbnail"]

                # Extract related tracks
                related_list = []
                for t in tracks[1:15]:
                    tid = t.get("videoId")
                    if tid:
                        related_list.append({
                            "id": tid,
                            "title": t.get("title", "Unknown"),
                            "artists": [a.get("name") for a in t.get("artists", []) if a.get("name")],
                            "duration": t.get("length", "0:00"),
                            "thumbnail": _get_best_thumbnail(t.get("thumbnail")) or f"https://i.ytimg.com/vi/{tid}/hqdefault.jpg",
                            "year": _extract_year(t)
                        })
                info["related"] = related_list

            lyrics_id = watch_data.get("lyrics")
            if lyrics_id:
                try:
                    lyrics_res = ytmusic.get_lyrics(lyrics_id)
                    if lyrics_res and "lyrics" in lyrics_res:
                        info["lyrics"] = lyrics_res.get("lyrics")
                except Exception:
                    pass

        memory_cache.set(cache_key, info, ttl_seconds=3600)
        return info
    except Exception as e:
        print(f"Error fetching track info for {video_id}: {e}")
        return info
