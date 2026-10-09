export interface Track {
  id: string;
  title: string;
  artists: string[];
  album?: string;
  duration?: string;
  duration_seconds?: number;
  thumbnail?: string;
  views?: string;
  is_explicit?: boolean;
  year?: string | number;
  localUri?: string; // Set when available locally on disk (offline ready)
  isCached?: boolean; // Set if stored in stream cache
  isDownloaded?: boolean; // Set if permanently downloaded
  fileSize?: number;
  playedAt?: number; // Timestamp of playback
  isSaved?: boolean; // Set if marked as saved / favorite
  savedAt?: number; // Timestamp of saving
  customNote?: string; // User editable custom note
  downloadFormat?: 'mp3' | 'mp4';
}

export interface ReleaseItem {
  id: string;
  playlist_id?: string;
  title: string;
  type: string; // 'Album' | 'Single'
  artists: string[];
  thumbnail?: string;
  year?: string | number;
  is_explicit?: boolean;
}

export interface DownloadTask {
  id: string; // Track id
  track: Track;
  progress: number; // 0.0 - 1.0
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  bytesWritten: number;
  totalBytes: number;
  format?: 'mp3' | 'mp4';
}

export type TabType = 'discover' | 'search' | 'library' | 'settings';
