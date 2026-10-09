# Mseek - VidMate-Style Mobile Music Downloader & Player

Mseek is a full-featured music streaming and download application built with **React Native (Expo SDK 57)** and a **Python FastAPI** backend microservice powered by **ytmusicapi** and **yt-dlp**.

It features **Transparent Stream Caching & 100% Offline Playback History**: any track listened to is automatically cached in device storage so users can replay it anytime without internet, alongside explicit high-quality permanent MP3 downloads.

---

## Architecture Overview

```
+----------------------------------------------------------------------------------------------------+
|                                  Mobile App (React Native / Expo)                                  |
|                                                                                                    |
|  +-------------------+  +-------------------+  +------------------------------------------------+  |
|  |   Discover Screen |  |   Search Screen   |  |        Downloads & History Library             |  |
|  | - New Releases    |  | - Live YouTube    |  | - Downloaded MP3s (Permanent Storage)         |  |
|  | - Trending Charts |  |   Music Query     |  | - Played / History Cache (100% Offline Playable)|  |
|  | - Genre Feeds     |  | - Quick Download  |  | - Active Downloads Progress                    |  |
|  +-------------------+  +-------------------+  +------------------------------------------------+  |
|                                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                       Smart Audio Engine & Cache Resolver                                    |  |
|  |   1. Check Local Downloads -> 2. Check Stream Cache (History) -> 3. Stream & Auto-Cache      |  |
|  |   - Bottom Mini-Player  |  Full-Screen Player Modal  |  Background Audio                     |  |
|  +-----------------------------------------------------------------------------+  |
+---------------------------------------------------+------------------------------------------------+
                                                    | REST API (HTTP)
                                                    v
+----------------------------------------------------------------------------------------------------+
|                                    Backend Microservice (FastAPI)                                  |
|                                                                                                    |
|  +---------------------------+  +----------------------------------+  +-------------------------+  |
|  |        ytmusicapi         |  |             yt-dlp               |  | Audio Stream & Download  |  |
|  | - New Releases & Charts   |  | - Direct Progressive Audio Stream|  | - MP3/M4A Transcoding   |  |
|  | - YouTube Music Search    |  | - Metadata & Thumbnails Extractor|  | - Fast Chunk Streaming  |  |
|  +---------------------------+  +----------------------------------+  +-------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## Key Features

1. **Discover New Releases & Trending Charts**:
   - YouTube Music official explore releases, singles, and trending tracks with instant album tracklist view.
2. **Fast Music Search**:
   - Search across YouTube Music with instant track, video, and album filtering.
3. **Smart Audio Engine & Offline Stream Caching**:
   - Offline-First playback: checks local downloads and stream cache first before fetching over network.
   - Automatically saves played streams to `stream_cache/` in the background.
   - Replay any song from your History completely offline without an internet connection.
4. **Permanent Downloads Manager**:
   - Direct high-quality audio downloads with real-time download progress bar.
   - Zero-data promotion: instantly promote any cached track to permanent downloads without re-downloading.
5. **Persistent Player UI**:
   - Bottom Mini-Player visible across all tabs.
   - Full-Screen Player modal with rotating vinyl artwork, interactive seek slider, queue view, and repeat/shuffle controls.
6. **Preferences & Cache Settings**:
   - View live stream cache size on disk.
   - One-tap "Clear Stream Cache" button.
   - Auto-cache toggle and audio quality selector (320kbps / 160kbps / 96kbps).
   - Dynamic backend server URL configuration for easy LAN/Wi-Fi physical device testing.

---

## Getting Started

### 1. Prerequisites
- Python 3.12+ (Python 3.13 tested)
- Node.js 18+ and npm

### 2. Backend Setup & Run

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the microservice:
   ```bash
   python run_server.py
   ```
   The backend starts at `http://0.0.0.0:8000`. Interactive API documentation is available at `http://localhost:8000/docs`.

4. Run automated backend tests:
   ```bash
   pytest tests
   ```

### 3. Mobile App Setup & Run

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
2. Start the Expo development server:
   ```bash
   npm run start
   ```
   Or to run on Android / iOS / Web:
   ```bash
   npm run android
   npm run ios
   npm run web
   ```
3. If running on a physical mobile device with Expo Go, open **Settings** tab in the app and set the Backend Server URL to your PC's local network IP address (e.g., `http://192.168.1.50:8000`), then tap **Test** to connect.

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status and root info |
| `GET` | `/api/health` | Healthcheck endpoint |
| `GET` | `/api/music/new-releases` | YouTube Music explore new release albums & singles |
| `GET` | `/api/music/trending` | Current trending music tracks |
| `GET` | `/api/music/search?q={query}&filter={filter}` | Search tracks/videos/albums |
| `GET` | `/api/music/album/{browse_id}` | Album tracklist |
| `GET` | `/api/music/stream/{video_id}` | Direct progressive audio stream URL |
| `GET` | `/api/music/info/{video_id}` | Track details, lyrics, and related tracks |
| `GET` | `/api/music/download/{video_id}` | Direct audio file download stream |
