'use client';

import React, { useState } from 'react';
import { X, FolderPlus, Loader2 } from 'lucide-react';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  parentId: string | null;
  onCreated: () => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  onClose,
  accountId,
  parentId,
  onCreated,
}) => {
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !accountId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/v1/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          parentId,
          name: folderName.trim(),
          isFolder: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      setFolderName('');
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl glass-panel border border-white/15 bg-slate-900/95 p-5 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Buat Folder Baru</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300 mb-1 block">Nama Folder:</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Contoh: Dokumen PKL"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
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
              disabled={isSubmitting || !folderName.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 shadow-md shadow-amber-600/30"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Buat Folder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
