'use client';

import React, { useState } from 'react';
import { UnifiedFile } from '@/lib/storage/types';
import { X, RefreshCw, Loader2, Save } from 'lucide-react';

interface ReplaceContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: UnifiedFile | null;
  onUpdated: () => void;
}

export const ReplaceContentModal: React.FC<ReplaceContentModalProps> = ({
  isOpen,
  onClose,
  file,
  onUpdated,
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !file) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/v1/files/${file.providerFileId}/content?account=${file.accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: content,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update content');
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal mengganti isi file');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl glass-panel border border-white/15 bg-slate-900/95 p-5 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Ganti Isi File (Edit Konten)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-3 truncate">
          File: <span className="text-slate-200 font-medium">{file.name}</span> ({file.accountLabel})
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300 mb-1 block">Konten Baru:</label>
            <textarea
              rows={8}
              placeholder="Tulis atau tempel teks / konten pengganti di sini..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 shadow-md shadow-emerald-600/30"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Save className="h-3.5 w-3.5" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
