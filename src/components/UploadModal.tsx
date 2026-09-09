'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, FileUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  parentId: string | null;
  onUploaded: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  accountId,
  parentId,
  onUploaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ text: string; isAutoMoved?: boolean } | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !accountId) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
      setResultMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('accountId', accountId);
      if (parentId) formData.append('parentId', parentId);

      const res = await fetch('/api/v1/files', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      if (data.classification?.action === 'auto_moved') {
        setResultMessage({
          text: `File "${selectedFile.name}" berhasil diupload dan otomatis dipindahkan ke "${data.classification.predictedTargetFolderName}" oleh Smart Auto-Organization!`,
          isAutoMoved: true,
        });
      } else {
        setResultMessage({
          text: `File "${selectedFile.name}" berhasil diupload!`,
          isAutoMoved: false,
        });
      }

      onUploaded();
      setTimeout(() => {
        onClose();
        setSelectedFile(null);
        setResultMessage(null);
      }, 1800);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengunggah file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl glass-panel border border-white/15 bg-slate-900/95 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Upload File ke Akun</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {resultMessage ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-emerald-300">{resultMessage.text}</p>
            {resultMessage.isAutoMoved && (
              <span className="inline-flex items-center gap-1 text-[11px] text-pink-400 font-medium">
                <Sparkles className="h-3.5 w-3.5" /> Auto-Organization active
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-cyan-400/50 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all flex flex-col items-center gap-2"
            >
              <FileUp className="h-10 w-10 text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-white">
                  {selectedFile ? selectedFile.name : 'Klik untuk pilih file'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedFile ? formatBytes(selectedFile.size) : 'Semua format file didukung'}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pink-400 shrink-0" />
              <span>File yang diupload akan otomatis dicek oleh Rule & AI Classifier untuk folder yang tepat.</span>
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !selectedFile}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 shadow-md shadow-blue-600/30"
              >
                {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{isUploading ? 'Mengunggah...' : 'Unggah Sekarang'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
