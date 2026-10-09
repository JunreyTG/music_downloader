export const formatDuration = (millisOrSeconds: number, isSeconds = false): string => {
  const totalSeconds = isSeconds ? Math.floor(millisOrSeconds) : Math.floor(millisOrSeconds / 1000);
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const parseDurationToMillis = (durationStr?: string, durationSec?: number): number => {
  if (durationSec && durationSec > 0) return durationSec * 1000;
  if (!durationStr) return 0;
  const clean = durationStr.trim();
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  } else if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return 0;
};

export const formatTimeAgo = (timestamp?: number): string => {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

export const formatFileSize = (bytes: number): string => {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

export const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
};

export const get720pThumbnail = (url?: string): string | undefined => {
  if (!url) return undefined;
  if (url.includes('googleusercontent.com')) {
    return url.replace(/=w\d+-h\d+[^?]*/, '=w720-h720-l90-rj').replace(/=s\d+[^?]*/, '=s720-c');
  }
  if (url.includes('i.ytimg.com/vi/')) {
    return url.replace(/\/(default|mqdefault|hqdefault|sddefault)\.jpg/, '/hq720.jpg');
  }
  return url;
};
