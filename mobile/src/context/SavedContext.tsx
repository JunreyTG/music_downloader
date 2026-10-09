import React, { createContext, useContext, useState, useEffect } from 'react';
import { Track } from '../types';
import {
  getSavedTracks,
  saveTrack as saveService,
  removeSavedTrack as removeService,
  updateSavedTrack as updateService,
  clearAllSaved as clearService,
} from '../services/savedManager';

interface SavedContextType {
  savedTracks: Track[];
  saveTrack: (track: Track) => Promise<void>;
  removeSavedTrack: (videoId: string) => Promise<void>;
  toggleSaveTrack: (track: Track) => Promise<boolean>;
  updateSavedTrack: (videoId: string, updates: Partial<Track>) => Promise<void>;
  clearAllSaved: () => Promise<void>;
  isSaved: (videoId: string) => boolean;
  refreshSaved: () => Promise<void>;
}

const SavedContext = createContext<SavedContextType | null>(null);

export const SavedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedTracks, setSavedTracks] = useState<Track[]>([]);

  const refreshSaved = async () => {
    try {
      const items = await getSavedTracks();
      setSavedTracks(items);
    } catch (e) {
      console.warn('Failed to refresh saved tracks:', e);
    }
  };

  useEffect(() => {
    refreshSaved();
  }, []);

  const isSaved = (videoId: string): boolean => {
    return savedTracks.some((t) => t.id === videoId);
  };

  const saveTrack = async (track: Track) => {
    try {
      const updated = await saveService(track);
      setSavedTracks(updated);
    } catch (e) {
      console.warn('Failed to save track:', e);
    }
  };

  const removeSavedTrack = async (videoId: string) => {
    try {
      const updated = await removeService(videoId);
      setSavedTracks(updated);
    } catch (e) {
      console.warn('Failed to remove saved track:', e);
    }
  };

  const toggleSaveTrack = async (track: Track): Promise<boolean> => {
    try {
      if (isSaved(track.id)) {
        await removeSavedTrack(track.id);
        return false;
      } else {
        await saveTrack(track);
        return true;
      }
    } catch (e) {
      console.warn('Failed to toggle save track:', e);
      return false;
    }
  };

  const updateSavedTrack = async (videoId: string, updates: Partial<Track>) => {
    try {
      const updated = await updateService(videoId, updates);
      setSavedTracks(updated);
    } catch (e) {
      console.warn('Failed to update saved track:', e);
    }
  };

  const clearAllSaved = async () => {
    try {
      await clearService();
      setSavedTracks([]);
    } catch (e) {
      console.warn('Failed to clear all saved:', e);
    }
  };

  return (
    <SavedContext.Provider
      value={{
        savedTracks,
        saveTrack,
        removeSavedTrack,
        toggleSaveTrack,
        updateSavedTrack,
        clearAllSaved,
        isSaved,
        refreshSaved,
      }}
    >
      {children}
    </SavedContext.Provider>
  );
};

export const useSaved = (): SavedContextType => {
  const context = useContext(SavedContext);
  if (!context) {
    throw new Error('useSaved must be used within a SavedProvider');
  }
  return context;
};
