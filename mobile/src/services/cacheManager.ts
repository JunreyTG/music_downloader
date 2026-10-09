import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../types';

export const PLAY_HISTORY_KEY = '@mseek_play_history';
export const DOWNLOADS_INDEX_KEY = '@mseek_downloads_index';

// Platform safe directories
const BASE_CACHE = (FileSystem && FileSystem.cacheDirectory) || (FileSystem && FileSystem.documentDirectory ? `${FileSystem.documentDirectory}cache/` : '');
const BASE_DOC = (FileSystem && FileSystem.documentDirectory) || '';

export const STREAM_CACHE_DIR = BASE_CACHE ? `${BASE_CACHE}stream_cache/` : '';
export const DOWNLOADS_DIR = BASE_DOC ? `${BASE_DOC}downloads/` : '';

export const initDirectories = async (): Promise<void> => {
  if (!STREAM_CACHE_DIR || !DOWNLOADS_DIR || !FileSystem?.getInfoAsync) {
    return;
  }
  try {
    const cacheInfo = await FileSystem.getInfoAsync(STREAM_CACHE_DIR);
    if (!cacheInfo.exists) {
      await FileSystem.makeDirectoryAsync(STREAM_CACHE_DIR, { intermediates: true });
    }

    const dlInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!dlInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
  } catch (e) {
    console.warn('Failed to initialize directories:', e);
  }
};

/**
 * Checks if audio file is available locally on disk.
 * Returns local file URI (file://...) or null.
 */
export const getLocalAudioUri = async (videoId: string): Promise<string | null> => {
  try {
    // 1. Check permanent downloads first (.m4a, .mp4, .mp3)
    for (const ext of ['m4a', 'mp4', 'mp3']) {
      const dlPath = `${DOWNLOADS_DIR}${videoId}.${ext}`;
      const dlInfo = await FileSystem.getInfoAsync(dlPath);
      if (dlInfo.exists && (!('size' in dlInfo) || (dlInfo as any).size > 1024)) return dlPath;
    }

    // 2. Check stream cache (auto-cached from prior playback)
    for (const ext of ['m4a', 'mp4', 'mp3']) {
      const cachePath = `${STREAM_CACHE_DIR}${videoId}.${ext}`;
      const cacheInfo = await FileSystem.getInfoAsync(cachePath);
      if (cacheInfo.exists) {
        if ('size' in cacheInfo && (cacheInfo as any).size <= 1024) {
          await FileSystem.deleteAsync(cachePath, { idempotent: true }).catch(() => {});
        } else {
          return cachePath;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Auto-caches a streaming audio track into stream_cache in background
 * and logs it to Playback History so it can be played offline anytime.
 */
export const cacheStreamInBackground = async (track: Track, streamUrl: string): Promise<string | null> => {
  try {
    await initDirectories();
    const cachePath = `${STREAM_CACHE_DIR}${track.id}.mp3`;
    const check = await FileSystem.getInfoAsync(cachePath);

    let localPath = cachePath;
    if (!check.exists) {
      // Stream download to cache file
      const downloadRes = await FileSystem.downloadAsync(streamUrl, cachePath);
      localPath = downloadRes.uri;
    }

    // Record in history with local disk URI
    await recordPlayHistory({
      ...track,
      localUri: localPath,
      isCached: true,
      playedAt: Date.now()
    });

    return localPath;
  } catch (err) {
    console.warn('Background stream caching error:', err);
    // Even if caching failed, still record play history
    await recordPlayHistory({
      ...track,
      playedAt: Date.now()
    });
    return null;
  }
};

/**
 * Persists track into Play History (maximum 200 items, most recent first).
 */
export const recordPlayHistory = async (track: Track): Promise<Track[]> => {
  try {
    const raw = await AsyncStorage.getItem(PLAY_HISTORY_KEY);
    let history: Track[] = raw ? JSON.parse(raw) : [];

    // Filter out existing occurrence of this track
    history = history.filter((t) => t.id !== track.id);

    // Insert at front
    const updated: Track = {
      ...track,
      playedAt: Date.now(),
    };
    history.unshift(updated);

    // Limit to 200 tracks
    if (history.length > 200) {
      history = history.slice(0, 200);
    }

    await AsyncStorage.setItem(PLAY_HISTORY_KEY, JSON.stringify(history));
    return history;
  } catch (e) {
    console.warn('Failed to record play history:', e);
    return [];
  }
};

/**
 * Retrieve all history tracks with up-to-date local disk existence check.
 */
export const getPlayHistory = async (): Promise<Track[]> => {
  try {
    const raw = await AsyncStorage.getItem(PLAY_HISTORY_KEY);
    if (!raw) return [];
    const history: Track[] = JSON.parse(raw);

    // Check disk availability for offline readiness
    const validated = await Promise.all(
      history.map(async (t) => {
        const localUri = await getLocalAudioUri(t.id);
        return {
          ...t,
          localUri: localUri || undefined,
          isCached: !!localUri,
        };
      })
    );
    return validated;
  } catch {
    return [];
  }
};

/**
 * Calculates total size of cached audio files in stream_cache in bytes.
 */
export const getStreamCacheSize = async (): Promise<number> => {
  try {
    await initDirectories();
    const info = await FileSystem.getInfoAsync(STREAM_CACHE_DIR);
    if (!info.exists) return 0;
    const files = await FileSystem.readDirectoryAsync(STREAM_CACHE_DIR);
    let total = 0;
    for (const f of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${STREAM_CACHE_DIR}${f}`);
      if (fileInfo.exists && !fileInfo.isDirectory) {
        total += (fileInfo as any).size || 0;
      }
    }
    return total;
  } catch {
    return 0;
  }
};

/**
 * Clears stream cache files.
 */
export const clearStreamCache = async (): Promise<void> => {
  try {
    const info = await FileSystem.getInfoAsync(STREAM_CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(STREAM_CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(STREAM_CACHE_DIR, { intermediates: true });
    }
  } catch (e) {
    console.warn('Failed to clear stream cache:', e);
  }
};

/**
 * Promotes a cached song to permanent downloads without re-downloading.
 */
export const promoteCacheToDownload = async (track: Track): Promise<boolean> => {
  try {
    await initDirectories();
    const cachePath = `${STREAM_CACHE_DIR}${track.id}.mp3`;
    const targetPath = `${DOWNLOADS_DIR}${track.id}.mp3`;

    const cacheInfo = await FileSystem.getInfoAsync(cachePath);
    if (cacheInfo.exists) {
      await FileSystem.copyAsync({ from: cachePath, to: targetPath });
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Deletes a single track from play history and removes its stream cache file.
 */
export const deleteHistoryItem = async (videoId: string): Promise<Track[]> => {
  try {
    const raw = await AsyncStorage.getItem(PLAY_HISTORY_KEY);
    let history: Track[] = raw ? JSON.parse(raw) : [];
    history = history.filter((t) => t.id !== videoId);
    await AsyncStorage.setItem(PLAY_HISTORY_KEY, JSON.stringify(history));

    const cachePath = `${STREAM_CACHE_DIR}${videoId}.mp3`;
    const check = await FileSystem.getInfoAsync(cachePath);
    if (check.exists) {
      await FileSystem.deleteAsync(cachePath, { idempotent: true }).catch(() => {});
    }

    return history;
  } catch (e) {
    console.warn('Failed to delete history item:', e);
    return [];
  }
};

/**
 * Updates metadata or custom note of a track in history.
 */
export const updateHistoryTrack = async (videoId: string, updates: Partial<Track>): Promise<Track[]> => {
  try {
    const raw = await AsyncStorage.getItem(PLAY_HISTORY_KEY);
    let history: Track[] = raw ? JSON.parse(raw) : [];
    history = history.map((t) => (t.id === videoId ? { ...t, ...updates } : t));
    await AsyncStorage.setItem(PLAY_HISTORY_KEY, JSON.stringify(history));
    return history;
  } catch (e) {
    console.warn('Failed to update history track:', e);
    return [];
  }
};

/**
 * Clears all play history and all cached stream audio files.
 */
export const clearAllHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PLAY_HISTORY_KEY);
    await clearStreamCache();
  } catch (e) {
    console.warn('Failed to clear all history:', e);
  }
};

