import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../types';

export const SAVED_TRACKS_KEY = '@mseek_saved_tracks';

/**
 * Retrieve all saved/favorited tracks.
 */
export const getSavedTracks = async (): Promise<Track[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_TRACKS_KEY);
    if (!raw) return [];
    const list: Track[] = JSON.parse(raw);
    return list;
  } catch (e) {
    console.warn('Failed to get saved tracks:', e);
    return [];
  }
};

/**
 * Save / Favorite a track (Create).
 */
export const saveTrack = async (track: Track): Promise<Track[]> => {
  try {
    const list = await getSavedTracks();
    const filtered = list.filter((t) => t.id !== track.id);
    const updated: Track = {
      ...track,
      isSaved: true,
      savedAt: Date.now(),
    };
    filtered.unshift(updated);
    await AsyncStorage.setItem(SAVED_TRACKS_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.warn('Failed to save track:', e);
    return [];
  }
};

/**
 * Remove a track from saved / favorites (Delete).
 */
export const removeSavedTrack = async (videoId: string): Promise<Track[]> => {
  try {
    const list = await getSavedTracks();
    const filtered = list.filter((t) => t.id !== videoId);
    await AsyncStorage.setItem(SAVED_TRACKS_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.warn('Failed to remove saved track:', e);
    return [];
  }
};

/**
 * Update a saved track metadata or note (Update).
 */
export const updateSavedTrack = async (videoId: string, updates: Partial<Track>): Promise<Track[]> => {
  try {
    const list = await getSavedTracks();
    const updated = list.map((t) => (t.id === videoId ? { ...t, ...updates } : t));
    await AsyncStorage.setItem(SAVED_TRACKS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to update saved track:', e);
    return [];
  }
};

/**
 * Clear all saved tracks (Delete All).
 */
export const clearAllSaved = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SAVED_TRACKS_KEY);
  } catch (e) {
    console.warn('Failed to clear all saved tracks:', e);
  }
};
