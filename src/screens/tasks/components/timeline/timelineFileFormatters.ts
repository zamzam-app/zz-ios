// ─── File Size Formatting ───────────────────────────────────────────────────

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export function formatFileSize(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes === 0) return '0 B';

  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${UNITS[i]}`;
}
