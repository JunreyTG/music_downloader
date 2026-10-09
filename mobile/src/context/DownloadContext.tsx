import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Track, DownloadTask } from '../types';
import {
  getDownloadedTracks,
  saveDownloadedTrack,
  deleteDownloadedTrack,
  clearAllDownloads as clearAllDownloadsService,
  updateDownloadedTrack as updateDownloadedTrackService,
  getDownloadsTotalSize,
} from '../services/downloadManager';
import { DOWNLOADS_DIR, initDirectories, promoteCacheToDownload } from '../services/cacheManager';
import { musicApi } from '../api/client';
import { DownloadQualityModal } from '../components/DownloadQualityModal';

interface DownloadContextType {
  downloads: Track[];
  downloadsSizeBytes: number;
  activeTasks: Record<string, DownloadTask>;
  refreshDownloads: () => Promise<void>;
  downloadTrack: (track: Track, format?: 'mp3' | 'mp4') => Promise<void>;
  promptDownload: (track: Track) => void;
  pauseDownload: (videoId: string) => Promise<void>;
  resumeDownload: (videoId: string) => Promise<void>;
  cancelDownload: (videoId: string) => Promise<void>;
  retryDownload: (videoId: string) => Promise<void>;
  deleteTrack: (videoId: string) => Promise<void>;
  clearAllDownloads: () => Promise<void>;
  updateDownloadedTrack: (videoId: string, updates: Partial<Track>) => Promise<void>;
  isDownloaded: (videoId: string) => boolean;
}

const DownloadContext = createContext<DownloadContextType | null>(null);

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<Track[]>([]);
  const [downloadsSizeBytes, setDownloadsSizeBytes] = useState<number>(0);
  const [activeTasks, setActiveTasks] = useState<Record<string, DownloadTask>>({});
  const [modalTrack, setModalTrack] = useState<Track | null>(null);

  const resumablesRef = useRef<Record<string, FileSystem.DownloadResumable>>({});

  const refreshDownloads = async () => {
    try {
      const list = await getDownloadedTracks();
      setDownloads(list);
      const size = await getDownloadsTotalSize();
      setDownloadsSizeBytes(size);
    } catch (err) {
      console.warn('Error refreshing downloads:', err);
    }
  };

  useEffect(() => {
    refreshDownloads();
  }, []);

  const isDownloaded = (videoId: string): boolean => {
    return downloads.some((d) => d.id === videoId);
  };

  const promptDownload = (track: Track) => {
    if (isDownloaded(track.id)) {
      console.log(`Track ${track.title} is already downloaded.`);
      return;
    }
    setModalTrack(track);
  };

  const handleSelectQuality = async (format: 'mp3' | 'mp4') => {
    const track = modalTrack;
    setModalTrack(null);
    if (track) {
      await downloadTrack(track, format);
    }
  };

  const downloadTrack = async (track: Track, format: 'mp3' | 'mp4' = 'mp3') => {
    if (isDownloaded(track.id)) {
      console.log(`Track ${track.title} is already downloaded.`);
      return;
    }

    try {
      await initDirectories();

      // Check if already in stream cache -> instant promotion
      const promoted = await promoteCacheToDownload(track);
      if (promoted) {
        await saveDownloadedTrack(track, format);
        await refreshDownloads();
        return;
      }

      // Initialize active task in UI
      const initialTask: DownloadTask = {
        id: track.id,
        track,
        progress: 0.05,
        status: 'downloading',
        bytesWritten: 0,
        totalBytes: 0,
        format,
      };
      setActiveTasks((prev) => ({ ...prev, [track.id]: initialTask }));

      const ext = format === 'mp4' ? 'm4a' : 'mp3';
      const targetPath = `${DOWNLOADS_DIR}${track.id}.${ext}`;

      // Use backend download API directly - this resolves and processes on server via yt-dlp
      const downloadUrl = musicApi.getDownloadUrl(track.id, format);

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        targetPath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten /
            (downloadProgress.totalBytesExpectedToWrite || 1);
          setActiveTasks((prev) => {
            if (!prev[track.id] || prev[track.id].status === 'paused') return prev;
            return {
              ...prev,
              [track.id]: {
                ...prev[track.id],
                progress: Math.min(Math.max(progress, 0.05), 1),
                bytesWritten: downloadProgress.totalBytesWritten,
                totalBytes: downloadProgress.totalBytesExpectedToWrite,
                status: 'downloading',
              },
            };
          });
        }
      );

      resumablesRef.current[track.id] = downloadResumable;

      const result = await downloadResumable.downloadAsync();
      delete resumablesRef.current[track.id];

      if (result && result.uri) {
        await saveDownloadedTrack(track, format);
        await refreshDownloads();
        // Remove completed task
        setActiveTasks((prev) => {
          const copy = { ...prev };
          delete copy[track.id];
          return copy;
        });
      }
    } catch (err: any) {
      console.warn('Download track failed:', err);
      // If task was paused or cancelled by user, don't mark as failed
      setActiveTasks((prev) => {
        if (!prev[track.id] || prev[track.id].status === 'paused') return prev;
        return {
          ...prev,
          [track.id]: { ...prev[track.id], status: 'failed' },
        };
      });
    }
  };

  const pauseDownload = async (videoId: string) => {
    try {
      const resumable = resumablesRef.current[videoId];
      if (resumable) {
        setActiveTasks((prev) => {
          if (!prev[videoId]) return prev;
          return {
            ...prev,
            [videoId]: { ...prev[videoId], status: 'paused' },
          };
        });
        await resumable.pauseAsync();
      }
    } catch (e) {
      console.warn('Failed to pause download:', e);
    }
  };

  const resumeDownload = async (videoId: string) => {
    try {
      const resumable = resumablesRef.current[videoId];
      const currentTask = activeTasks[videoId];
      if (resumable && currentTask) {
        setActiveTasks((prev) => {
          if (!prev[videoId]) return prev;
          return {
            ...prev,
            [videoId]: { ...prev[videoId], status: 'downloading' },
          };
        });
        const result = await resumable.resumeAsync();
        delete resumablesRef.current[videoId];
        if (result && result.uri) {
          await saveDownloadedTrack(currentTask.track, currentTask.format || 'mp3');
          await refreshDownloads();
          setActiveTasks((prev) => {
            const copy = { ...prev };
            delete copy[videoId];
            return copy;
          });
        }
      } else if (currentTask) {
        await downloadTrack(currentTask.track, currentTask.format || 'mp3');
      }
    } catch (e) {
      console.warn('Failed to resume download:', e);
    }
  };

  const cancelDownload = async (videoId: string) => {
    try {
      const resumable = resumablesRef.current[videoId];
      if (resumable) {
        try {
          await resumable.pauseAsync();
        } catch {}
        delete resumablesRef.current[videoId];
      }
      const task = activeTasks[videoId];
      const ext = task?.format === 'mp4' ? 'm4a' : 'mp3';
      const targetPath = `${DOWNLOADS_DIR}${videoId}.${ext}`;
      try {
        await FileSystem.deleteAsync(targetPath, { idempotent: true });
      } catch {}

      setActiveTasks((prev) => {
        const copy = { ...prev };
        delete copy[videoId];
        return copy;
      });
    } catch (e) {
      console.warn('Failed to cancel download:', e);
    }
  };

  const retryDownload = async (videoId: string) => {
    const task = activeTasks[videoId];
    if (task) {
      await cancelDownload(videoId);
      await downloadTrack(task.track, task.format || 'mp3');
    }
  };

  const deleteTrack = async (videoId: string) => {
    await deleteDownloadedTrack(videoId);
    await refreshDownloads();
  };

  const clearAllDownloads = async () => {
    await clearAllDownloadsService();
    await refreshDownloads();
  };

  const updateDownloadedTrack = async (videoId: string, updates: Partial<Track>) => {
    await updateDownloadedTrackService(videoId, updates);
    await refreshDownloads();
  };

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        downloadsSizeBytes,
        activeTasks,
        refreshDownloads,
        downloadTrack,
        promptDownload,
        pauseDownload,
        resumeDownload,
        cancelDownload,
        retryDownload,
        deleteTrack,
        clearAllDownloads,
        updateDownloadedTrack,
        isDownloaded,
      }}
    >
      {children}
      <DownloadQualityModal
        visible={!!modalTrack}
        track={modalTrack}
        onSelect={handleSelectQuality}
        onClose={() => setModalTrack(null)}
      />
    </DownloadContext.Provider>
  );
};

export const useDownloads = (): DownloadContextType => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownloads must be used within a DownloadProvider');
  }
  return context;
};
