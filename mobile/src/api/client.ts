import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track, ReleaseItem } from '../types';

export const SERVER_URL_KEY = '@mseek_server_url';
export const FALLBACK_LAN_IP = '192.168.0.47';
export const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_API_URL || `http://${FALLBACK_LAN_IP}:8000`;

export const getAutoDetectedServerUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // If running on web
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname || 'localhost';
      return `http://${hostname}:8000`;
    }
    return 'http://localhost:8000';
  }

  // On physical Android device or iOS device:
  // Detect Metro bundler IP address from NativeModules.SourceCode.scriptURL
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const host = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:8000`;
      }
    }
  } catch {}

  // Fallback to PC's active Wi-Fi LAN IP
  return `http://${FALLBACK_LAN_IP}:8000`;
};

class MusicApiClient {
  private baseUrl: string = getAutoDetectedServerUrl();

  constructor() {
    this.init();
  }

  async init() {
    try {
      const stored = await AsyncStorage.getItem(SERVER_URL_KEY);
      if (stored) {
        let clean = stored.trim().replace(/\/$/, '');
        // On physical Android device, fix localhost/127.0.0.1 to LAN IP
        if (Platform.OS !== 'web' && (clean.includes('localhost') || clean.includes('127.0.0.1'))) {
          clean = getAutoDetectedServerUrl();
          await AsyncStorage.setItem(SERVER_URL_KEY, clean);
        }
        this.baseUrl = clean;
        return;
      }
    } catch {}
    this.baseUrl = getAutoDetectedServerUrl();
  }

  async setServerUrl(url: string) {
    this.baseUrl = url.trim().replace(/\/$/, '');
    await AsyncStorage.setItem(SERVER_URL_KEY, this.baseUrl);
  }

  getServerUrl(): string {
    return this.baseUrl;
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/health`, { method: 'GET' }, 3000);
      return res.ok;
    } catch {
      return false;
    }
  }

  async getNewReleases(): Promise<ReleaseItem[]> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/music/new-releases`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Failed to fetch new releases:', err);
      return [];
    }
  }

  async getTrending(): Promise<Track[]> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/music/trending`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Failed to fetch trending:', err);
      return [];
    }
  }

  async searchMusic(query: string, filter: string = 'songs'): Promise<Track[]> {
    try {
      const encoded = encodeURIComponent(query);
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/music/search?q=${encoded}&filter=${filter}&limit=30`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`Search failed for ${query}:`, err);
      return [];
    }
  }

  async getAlbumTracks(browseId: string): Promise<Track[]> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/music/album/${browseId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.tracks || [];
    } catch (err) {
      console.warn(`Failed to fetch album tracks ${browseId}:`, err);
      return [];
    }
  }

  async getStreamUrl(videoId: string, format: string = 'mp3'): Promise<{ stream_url: string; title: string; duration?: number; thumbnail?: string; format?: string }> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}/api/music/stream/${videoId}?format=${format}`);
    if (!res.ok) throw new Error(`Failed to resolve stream for ${videoId}`);
    return await res.json();
  }

  getDownloadUrl(videoId: string, format: string = 'mp3'): string {
    return `${this.baseUrl}/api/music/download/${videoId}?format=${format}`;
  }

  async getTrackInfo(videoId: string): Promise<{ id: string; title: string; artists: string[]; thumbnail?: string; lyrics?: string; related?: Track[] }> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/music/info/${videoId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`Failed to fetch track info for ${videoId}:`, err);
      return { id: videoId, title: 'Unknown', artists: [] };
    }
  }
}

export const musicApi = new MusicApiClient();
