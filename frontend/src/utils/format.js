export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

export const CATEGORY_COLORS = {
  images: '#f472b6',
  videos: '#a78bfa',
  documents: '#60a5fa',
  audio: '#34d399',
  archives: '#fbbf24',
  code: '#22d3ee',
  other: '#94a3b8',
};
