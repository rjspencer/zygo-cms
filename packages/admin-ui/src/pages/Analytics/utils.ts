export function formatCount(count: number): string {
  if (!count || count <= 0) return '0';
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const boundedIndex = Math.min(i, units.length - 1);
  const val = bytes / Math.pow(1024, boundedIndex);
  return `${val.toFixed(boundedIndex === 0 ? 0 : 1)} ${units[boundedIndex]}`;
}
