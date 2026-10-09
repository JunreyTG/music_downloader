import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Track } from '../types';
import { getLocalAudioUri, cacheStreamInBackground, recordPlayHistory } from '../services/cacheManager';
import { musicApi } from '../api/client';
import { audioEngine, PlaybackUpdate } from '../services/audioEngine';
import { parseDurationToMillis } from '../utils/formatters';

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  queue: Track[];
  isShuffle: boolean;
  isRepeat: boolean;
  isModalVisible: boolean;
  isOfflineMode: boolean;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  openModal: () => void;
  closeModal: () => void;
  setOfflineMode: (offline: boolean) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [position, setPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(1);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isOfflineMode, setOfflineMode] = useState<boolean>(false);

  // Playback request ID to prevent race conditions during rapid skipping
  const playRequestIdRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      audioEngine.unload().catch(() => {});
    };
  }, []);

  const onPlaybackStatusUpdate = (status: PlaybackUpdate) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.warn('Playback error:', status.error);
        setIsLoading(false);
      }
      return;
    }

    setPosition(status.positionMillis || 0);
    if (status.durationMillis && status.durationMillis > 1000) {
      setDuration(status.durationMillis);
    }
    setIsPlaying(status.isPlaying);
    setIsLoading(status.isBuffering);

    if (status.didJustFinish) {
      if (isRepeat) {
        seekTo(0).then(() => {
          audioEngine.play();
        });
      } else if (!isTransitioningRef.current) {
        isTransitioningRef.current = true;
        nextTrack();
      }
    }
  };

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    const reqId = ++playRequestIdRef.current;
    isTransitioningRef.current = true;

    try {
      // 1. Immediately unload current audio so old track ceases playing & emitting events!
      await audioEngine.unload();

      setIsLoading(true);
      setIsPlaying(false);
      setCurrentTrack(track);
      setPosition(0);

      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
      } else if (!queue.some((t) => t.id === track.id)) {
        setQueue((prev) => [...prev, track]);
      }

      // Calculate expected track duration upfront to prevent inaccurate seeker capping
      let expectedDurationMillis = parseDurationToMillis(track.duration, track.duration_seconds);
      if (expectedDurationMillis > 0) {
        setDuration(expectedDurationMillis);
      }

      // OFFLINE-FIRST RESOLUTION:
      // Step 1: Check if audio exists locally on disk (Downloads OR Stream Cache)
      const localUri = await getLocalAudioUri(track.id);

      // Check for superseded request
      if (reqId !== playRequestIdRef.current) return;

      let playUri = localUri;
      let shouldBackgroundCache = false;

      if (localUri) {
        console.log(`[AudioEngine] Playing local offline copy for "${track.title}" from: ${localUri}`);
        recordPlayHistory({ ...track, localUri, isCached: true });
      } else {
        // Step 2: If not found locally, fetch online stream
        console.log(`[AudioEngine] Fetching online stream for "${track.title}"...`);
        const streamData = await musicApi.getStreamUrl(track.id);

        if (reqId !== playRequestIdRef.current) return;

        playUri = streamData.stream_url;
        shouldBackgroundCache = true;

        if (!expectedDurationMillis && streamData.duration && streamData.duration > 0) {
          expectedDurationMillis = streamData.duration * 1000;
          setDuration(expectedDurationMillis);
        }
      }

      if (!playUri) {
        throw new Error('No audio source found');
      }

      if (reqId !== playRequestIdRef.current) return;

      // Load sound through safe universal audio engine with exact duration
      await audioEngine.loadAndPlay(playUri, onPlaybackStatusUpdate, expectedDurationMillis);

      if (reqId !== playRequestIdRef.current) return;

      setIsPlaying(true);
      setIsLoading(false);
      isTransitioningRef.current = false;

      // Step 3: Trigger background stream caching
      if (shouldBackgroundCache) {
        cacheStreamInBackground(track, playUri).catch((err) =>
          console.warn('Background caching warning:', err)
        );
      }
    } catch (error) {
      if (reqId === playRequestIdRef.current) {
        console.warn('Failed to play track:', error);
        setIsLoading(false);
        setIsPlaying(false);
        isTransitioningRef.current = false;
      }
    }
  };

  const togglePlayPause = async () => {
    try {
      if (isPlaying) {
        await audioEngine.pause();
        setIsPlaying(false);
      } else {
        await audioEngine.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Toggle play/pause failed:', err);
    }
  };

  const seekTo = async (millis: number) => {
    try {
      await audioEngine.seekTo(millis);
      setPosition(millis);
    } catch (err) {
      console.warn('Seek failed:', err);
    }
  };

  const nextTrack = async () => {
    if (!currentTrack) return;
    const currentQueue = queue.length > 0 ? queue : [currentTrack];
    const currentIndex = currentQueue.findIndex((t) => t.id === currentTrack.id);

    let nextIndex = 0;
    if (currentQueue.length > 1) {
      if (isShuffle) {
        do {
          nextIndex = Math.floor(Math.random() * currentQueue.length);
        } while (nextIndex === currentIndex && currentQueue.length > 1);
      } else {
        nextIndex = currentIndex >= 0 && currentIndex < currentQueue.length - 1 ? currentIndex + 1 : 0;
      }
    }

    const next = currentQueue[nextIndex];
    if (next) {
      await playTrack(next);
    }
  };

  const prevTrack = async () => {
    if (position > 4000) {
      await seekTo(0);
      return;
    }
    if (!currentTrack) return;
    const currentQueue = queue.length > 0 ? queue : [currentTrack];
    const currentIndex = currentQueue.findIndex((t) => t.id === currentTrack.id);

    let prevIndex = 0;
    if (currentQueue.length > 1) {
      prevIndex = currentIndex <= 0 ? currentQueue.length - 1 : currentIndex - 1;
    }

    const prev = currentQueue[prevIndex];
    if (prev) {
      await playTrack(prev);
    }
  };

  const toggleShuffle = () => setIsShuffle((prev) => !prev);
  const toggleRepeat = () => setIsRepeat((prev) => !prev);
  const openModal = () => setIsModalVisible(true);
  const closeModal = () => setIsModalVisible(false);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isLoading,
        position,
        duration,
        queue,
        isShuffle,
        isRepeat,
        isModalVisible,
        isOfflineMode,
        playTrack,
        togglePlayPause,
        seekTo,
        nextTrack,
        prevTrack,
        toggleShuffle,
        toggleRepeat,
        openModal,
        closeModal,
        setOfflineMode,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
