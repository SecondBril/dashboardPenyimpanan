'use client';

import React from 'react';
import { UnifiedFile } from '@/lib/storage/types';
import { formatBytes, formatDate, getFileCategory } from '@/lib/utils';
import { X, ExternalLink, Download, FileText, Calendar, HardDrive } from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: UnifiedFile | null;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  file,
}) => {
  if (!isOpen || !file) return null;

  const category = getFileCategory(file.mimeType, file.extension);
  const isOfficeOrDocs = 
    file.mimeType.includes('officedocument') ||
    file.mimeType.includes('google-apps.document') ||
    file.mimeType.includes('google-apps.spreadsheet') ||
    file.extension === 'docx' ||
    file.extension === 'xlsx' ||
    file.extension === 'pptx';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl glass-panel border border-white/15 bg-slate-900/95 p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white truncate" title={file.name}>
              {file.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span>{file.accountLabel}</span>
              <span>•</span>
              <span>{formatBytes(file.sizeBytes)}</span>
              <span>•</span>
              <span>{formatDate(file.modifiedAt)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-5 flex flex-col items-center justify-center min-h-[250px] w-full">
          {category === 'image' ? (
            <div className="rounded-xl overflow-hidden border border-white/10 max-h-[420px] max-w-full flex items-center justify-center bg-black/40">
              <img
                src={`/api/v1/files/${encodeURIComponent(file.providerFileId)}/download?account=${file.accountId}&inline=true`}
                alt={file.name}
                className="max-h-[400px] w-auto max-w-full object-contain"
                onError={(e) => {
                  // Fallback to previewUrl if direct stream failed
                  if (file.previewUrl && e.currentTarget.src !== file.previewUrl) {
                    e.currentTarget.src = file.previewUrl;
                  }
                }}
              />
            </div>
          ) : category === 'video' ? (
            <div className="rounded-xl overflow-hidden border border-white/10 max-h-[420px] max-w-full w-full flex items-center justify-center bg-black/60">
              <video
                src={`/api/v1/files/${encodeURIComponent(file.providerFileId)}/download?account=${file.accountId}&inline=true`}
                controls
                className="max-h-[400px] max-w-full w-auto rounded-lg"
              >
                Browser Anda tidak mendukung tag video.
              </video>
            </div>
          ) : category === 'audio' ? (
            <div className="text-center p-6 rounded-2xl bg-slate-950/60 border border-white/5 max-w-md w-full">
              <p className="text-sm font-semibold text-white mb-3">{file.name}</p>
              <audio
                src={`/api/v1/files/${encodeURIComponent(file.providerFileId)}/download?account=${file.accountId}&inline=true`}
                controls
                className="w-full"
              >
                Browser Anda tidak mendukung tag audio.
              </audio>
            </div>
          ) : category === 'pdf' ? (
            <div className="w-full h-[450px] rounded-xl overflow-hidden border border-white/10">
              <iframe
                src={`/api/v1/files/${encodeURIComponent(file.providerFileId)}/download?account=${file.accountId}&inline=true`}
                className="w-full h-full"
                title={file.name}
              />
            </div>
          ) : isOfficeOrDocs ? (
            <div className="text-center p-6 rounded-2xl bg-slate-950/60 border border-white/5 max-w-md">
              <FileText className="h-12 w-12 text-blue-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white mb-1">
                Dokumen Online
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Sesuai rekomendasi PRD, file Docs/Office dibuka langsung melalui aplikasi web editor resmi untuk pengalaman editing terbaik.
              </p>
              {file.previewUrl ? (
                <a
                  href={file.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all"
                >
                  <span>Buka di Tab Baru</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="text-xs text-amber-400">Tautan preview belum tersedia.</p>
              )}
            </div>
          ) : (
            <div className="text-center p-6 rounded-2xl bg-slate-950/60 border border-white/5 max-w-md w-full">
              <FileText className="h-12 w-12 text-cyan-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white mb-1">
                Pratinjau File
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Tipe: <code className="text-cyan-300">{file.mimeType}</code>
              </p>
              <div className="p-3 rounded-lg bg-slate-900 text-left text-xs font-mono text-slate-300 overflow-x-auto max-h-40 border border-white/5">
                File siap diunduh atau dipindahkan ke akun lain.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Provider: <span className="text-slate-200 capitalize">{file.provider.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/v1/files/${file.providerFileId}/download?account=${file.accountId}`}
              download={file.name}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              <span>Unduh File</span>
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
