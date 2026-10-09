import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../types';
import { DOWNLOADS_DIR, DOWNLOADS_INDEX_KEY, initDirectories } from './cacheManager';

/**
 * Retrieve all permanently downloaded tracks with verified file existence on device.
 */
export const getDownloadedTracks = async (): Promise<Track[]> => {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_INDEX_KEY);
    if (!raw) return [];
    const list: Track[] = JSON.parse(raw);
    
    // Validate each file still exists on device and has valid size
    const verified: Track[] = [];
    for (const item of list) {
      let foundPath: string | null = null;
      let foundSize: number | undefined = undefined;

      for (const ext of ['m4a', 'mp4', 'mp3']) {
        const candidate = `${DOWNLOADS_DIR}${item.id}.${ext}`;
        const info = await FileSystem.getInfoAsync(candidate);
        if (info.exists && (!('size' in info) || (info as any).size > 1024)) {
          foundPath = candidate;
          foundSize = (info as any).size;
          break;
        }
      }

      if (foundPath) {
        verified.push({
          ...item,
          localUri: foundPath,
          isDownloaded: true,
          fileSize: foundSize || item.fileSize,
        });
      }
    }

    if (verified.length !== list.length) {
      await AsyncStorage.setItem(DOWNLOADS_INDEX_KEY, JSON.stringify(verified));
    }
    return verified;
  } catch {
    return [];
  }
};

/**
 * Save or update a track in the downloaded index.
 */
export const saveDownloadedTrack = async (track: Track, format: 'mp3' | 'mp4' = 'mp3'): Promise<void> => {
  try {
    const current = await getDownloadedTracks();
    const updated = current.filter((t) => t.id !== track.id);
    const ext = format === 'mp4' ? 'm4a' : 'mp3';
    let path = `${DOWNLOADS_DIR}${track.id}.${ext}`;
    let info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      for (const alt of ['m4a', 'mp4', 'mp3']) {
        const altPath = `${DOWNLOADS_DIR}${track.id}.${alt}`;
        const altInfo = await FileSystem.getInfoAsync(altPath);
        if (altInfo.exists) {
          path = altPath;
          info = altInfo;
          break;
        }
      }
    }
    const size = info.exists ? (info as any).size : undefined;

    updated.unshift({
      ...track,
      localUri: path,
      isDownloaded: true,
      downloadFormat: format,
      fileSize: size || track.fileSize,
      playedAt: track.playedAt || Date.now(),
    });
    await AsyncStorage.setItem(DOWNLOADS_INDEX_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save downloaded track:', e);
  }
};

/**
 * Update metadata or custom note of a downloaded track.
 */
export const updateDownloadedTrack = async (videoId: string, updates: Partial<Track>): Promise<Track[]> => {
  try {
    const current = await getDownloadedTracks();
    const updated = current.map((t) => (t.id === videoId ? { ...t, ...updates } : t));
    await AsyncStorage.setItem(DOWNLOADS_INDEX_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to update downloaded track:', e);
    return [];
  }
};

/**
 * Delete a downloaded track file from device and remove from index.
 */
export const deleteDownloadedTrack = async (videoId: string): Promise<void> => {
  try {
    for (const ext of ['m4a', 'mp4', 'mp3']) {
      const path = `${DOWNLOADS_DIR}${videoId}.${ext}`;
      await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    }
    const current = await getDownloadedTracks();
    const filtered = current.filter((t) => t.id !== videoId);
    await AsyncStorage.setItem(DOWNLOADS_INDEX_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to delete track:', e);
  }
};

/**
 * Delete all downloaded files and clear index.
 */
export const clearAllDownloads = async (): Promise<void> => {
  try {
    await initDirectories();
    const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(DOWNLOADS_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
    await AsyncStorage.removeItem(DOWNLOADS_INDEX_KEY);
  } catch (e) {
    console.warn('Failed to clear all downloads:', e);
  }
};

/**
 * Calculate total byte size of all permanently downloaded files.
 */
export const getDownloadsTotalSize = async (): Promise<number> => {
  try {
    await initDirectories();
    const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!info.exists) return 0;
    
    const tracks = await getDownloadedTracks();
    let total = 0;
    for (const t of tracks) {
      if (t.fileSize) {
        total += t.fileSize;
      } else if (t.localUri) {
        const fileInfo = await FileSystem.getInfoAsync(t.localUri);
        if (fileInfo.exists && 'size' in fileInfo) {
          total += (fileInfo as any).size || 0;
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
};
