import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function getFileCategory(mimeType: string, extension?: string): string {
  const ext = extension?.toLowerCase().replace('.', '') || '';
  if (mimeType.includes('folder')) return 'folder';
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext)) return 'image';
  if (mimeType.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return 'video';
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) return 'audio';
  if (mimeType.includes('pdf') || ext === 'pdf') return 'pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'spreadsheet';
  if (mimeType.includes('document') || mimeType.includes('word') || ext === 'docx' || ext === 'doc') return 'document';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ext === 'pptx' || ext === 'ppt') return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip') || ext === 'zip' || ext === 'rar' || ext === '7z' || ext === 'tar' || ext === 'gz') return 'archive';
  if (mimeType.includes('text/') || mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('sql') || ['txt', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'sql', 'md'].includes(ext)) return 'code';
  return 'file';
}
