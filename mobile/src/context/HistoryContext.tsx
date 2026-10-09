import React, { createContext, useContext, useState, useEffect } from 'react';
import { Track } from '../types';
import {
  getPlayHistory,
  getStreamCacheSize,
  clearAllHistory as clearHistoryService,
  deleteHistoryItem as deleteHistoryService,
  updateHistoryTrack as updateHistoryService,
  promoteCacheToDownload as promoteService,
} from '../services/cacheManager';
import { saveDownloadedTrack } from '../services/downloadManager';

interface HistoryContextType {
  history: Track[];
  cacheSizeBytes: number;
  refreshHistory: () => Promise<void>;
  deleteHistoryItem: (videoId: string) => Promise<void>;
  updateHistoryTrack: (videoId: string, updates: Partial<Track>) => Promise<void>;
  clearHistoryCache: () => Promise<void>;
  promoteToDownload: (track: Track) => Promise<boolean>;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<Track[]>([]);
  const [cacheSizeBytes, setCacheSizeBytes] = useState<number>(0);

  const refreshHistory = async () => {
    try {
      const items = await getPlayHistory();
      setHistory(items);
      const size = await getStreamCacheSize();
      setCacheSizeBytes(size);
    } catch (e) {
      console.warn('Error refreshing history:', e);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const deleteHistoryItem = async (videoId: string) => {
    try {
      await deleteHistoryService(videoId);
      await refreshHistory();
    } catch (e) {
      console.warn('Failed to delete history item:', e);
    }
  };

  const updateHistoryTrack = async (videoId: string, updates: Partial<Track>) => {
    try {
      await updateHistoryService(videoId, updates);
      await refreshHistory();
    } catch (e) {
      console.warn('Failed to update history track:', e);
    }
  };

  const clearHistoryCache = async () => {
    try {
      await clearHistoryService();
      await refreshHistory();
    } catch (e) {
      console.warn('Failed to clear history cache:', e);
    }
  };

  const promoteToDownload = async (track: Track): Promise<boolean> => {
    const success = await promoteService(track);
    if (success) {
      await saveDownloadedTrack(track);
      await refreshHistory();
    }
    return success;
  };

  return (
    <HistoryContext.Provider
      value={{
        history,
        cacheSizeBytes,
        refreshHistory,
        deleteHistoryItem,
        updateHistoryTrack,
        clearHistoryCache,
        promoteToDownload,
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
