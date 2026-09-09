'use client';

import React, { useState, useEffect } from 'react';
import { UnifiedFile, AccountInfo, TransferOperation } from '@/lib/storage/types';
import { formatBytes } from '@/lib/utils';
import { ArrowRight, Copy, Move, X, Loader2, Folder, HardDrive, CornerDownRight } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: UnifiedFile | null;
  destAccount: AccountInfo | null;
  destFolderId: string | null;
  allAccounts?: AccountInfo[];
  onConfirm: (operation: TransferOperation, customDestAccount?: AccountInfo, customDestFolderId?: string | null) => Promise<void>;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  file,
  destAccount,
  destFolderId,
  allAccounts = [],
  onConfirm,
}) => {
  const [operation, setOperation] = useState<TransferOperation>('move');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Destination account
  const [selectedDestAccountId, setSelectedDestAccountId] = useState<string>('');
  
  // Destination folder: 'root' means Root (Folder Utama / Direktori Terluar)
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  const [availableFolders, setAvailableFolders] = useState<{ id: string; name: string }[]>([]);
  const [loadingFolders, setLoadingFolders] = useState<boolean>(false);

  useEffect(() => {
    if (destAccount) {
      setSelectedDestAccountId(destAccount.id);
    } else if (file && allAccounts.length > 0) {
      const otherAcc = allAccounts.find((a) => a.id !== file.accountId) || allAccounts[0];
      setSelectedDestAccountId(otherAcc.id);
    }
  }, [destAccount, file, allAccounts]);

  useEffect(() => {
    if (destFolderId && destFolderId !== 'root') {
      setSelectedFolderId(destFolderId);
    } else {
      setSelectedFolderId('root');
    }
  }, [destFolderId]);

  // Fetch available folders for selected destination account
  useEffect(() => {
    if (!selectedDestAccountId) return;
    
    let isMounted = true;
    setLoadingFolders(true);

    fetch(`/api/v1/files?account=${selectedDestAccountId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.items && Array.isArray(data.items)) {
          const folders = data.items
            .filter((item: UnifiedFile) => item.isFolder)
            .map((item: UnifiedFile) => ({
              id: item.providerFileId || (item.id.includes(':') ? item.id.split(':').slice(1).join(':') : item.id),
              name: item.name,
            }));
          setAvailableFolders(folders);
        } else {
          setAvailableFolders([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load destination folders:', err);
        if (isMounted) setAvailableFolders([]);
      })
      .finally(() => {
        if (isMounted) setLoadingFolders(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDestAccountId]);

  if (!isOpen || !file) return null;

  const targetAccount = allAccounts.find((a) => a.id === selectedDestAccountId) || destAccount;
  if (!targetAccount) return null;

  const isTargetRoot = !selectedFolderId || selectedFolderId === 'root';
  const targetFolderName = isTargetRoot 
    ? 'Root (Folder Utama / Direktori Terluar)' 
    : (availableFolders.find((f) => f.id === selectedFolderId)?.name || 'Subfolder Terpilih');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const finalDestFolderId = isTargetRoot ? null : selectedFolderId;
      await onConfirm(operation, targetAccount, finalDestFolderId);
      onClose();
    } catch (err) {
      console.error('Transfer submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl glass-panel border border-white/15 bg-slate-900/98 p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-1">
          {file.isFolder ? (
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Folder className="h-5 w-5" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <HardDrive className="h-5 w-5" />
            </div>
          )}
          <div>
            <h3 className="text-base font-bold text-white">
              {file.isFolder ? 'Transfer Direktori / Folder Antar Cloud' : 'Transfer File Antar Cloud'}
            </h3>
            <p className="text-xs text-slate-400">
              {file.isFolder 
                ? 'Pindahkan folder beserta seluruh file dan subfoldernya ke akun cloud tujuan.'
                : 'Pindahkan atau salin file secara streaming antar provider.'}
            </p>
          </div>
        </div>

        {/* Transfer Visual Route */}
        <div className="my-4 p-3.5 rounded-xl bg-slate-950/70 border border-white/10">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-sm">{file.isFolder ? '📁' : '📄'}</span>
            <span className="text-xs font-bold text-slate-100 truncate flex-1" title={file.name}>
              {file.name}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-medium">
              {file.isFolder ? 'Folder' : formatBytes(file.sizeBytes)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs gap-2 py-2 border-t border-b border-white/5">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Dari Akun Sumber:</span>
              <span className="font-semibold text-slate-300 truncate max-w-[150px]">{file.accountLabel}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-cyan-400 shrink-0" />
            <div className="flex flex-col text-right min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Ke Akun Tujuan:</span>
              <span className="font-semibold text-cyan-400 truncate max-w-[150px]">{targetAccount.label}</span>
            </div>
          </div>

          {/* Explicit Root / Destination Directory Detail Alert */}
          <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-2">
            <CornerDownRight className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400">Lokasi Penempatan:</span>
                <span className="font-semibold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded text-[11px] border border-cyan-500/30">
                  {targetFolderName}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isTargetRoot
                  ? `Item akan disimpan langsung di direktori terluar (Root) pada ${targetAccount.label}.`
                  : `Item akan disimpan di dalam folder "${targetFolderName}" pada ${targetAccount.label}.`}
              </p>
            </div>
          </div>
        </div>

        {/* Destination Account Selector */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
              1. Pilih Akun Tujuan:
            </label>
            <select
              value={selectedDestAccountId}
              onChange={(e) => {
                setSelectedDestAccountId(e.target.value);
                setSelectedFolderId('root');
              }}
              className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            >
              {allAccounts.map((acc) => (
                <option 
                  key={acc.id} 
                  value={acc.id} 
                  disabled={acc.id === file.accountId}
                  className="bg-slate-900 text-white"
                >
                  {acc.label} {acc.id === file.accountId ? '(Sumber Saat Ini)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Folder Selector (Root vs Subfolder) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-300">
                2. Pilih Folder Tujuan di Akun Ini:
              </label>
              {loadingFolders && (
                <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Memuat folder...
                </span>
              )}
            </div>

            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            >
              <option value="root" className="bg-slate-900 text-cyan-300 font-bold">
                📁 Root (Folder Utama / Direktori Terluar) [Default]
              </option>
              {availableFolders.map((f) => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                  📂 {f.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Pilih <strong className="text-cyan-400">Root</strong> untuk menempatkan di direktori utama, atau pilih salah satu folder tujuan di atas.
            </p>
          </div>
        </div>

        {/* Operation Choice: Move vs Copy */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-medium text-slate-300">3. Pilih Aksi Operasi:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOperation('move')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                operation === 'move'
                  ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400'
                  : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
              }`}
            >
              <Move className="h-4 w-4" />
              <span>Pindahkan (Move)</span>
              <span className="text-[10px] font-normal text-slate-500">
                {file.isFolder ? 'Hapus folder di sumber setelah disalin' : 'Hapus file di sumber'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOperation('copy')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                operation === 'copy'
                  ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400'
                  : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
              }`}
            >
              <Copy className="h-4 w-4" />
              <span>Salin (Copy)</span>
              <span className="text-[10px] font-normal text-slate-500">
                {file.isFolder ? 'Pertahankan folder di sumber' : 'Pertahankan file sumber'}
              </span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Mulai Transfer ke {isTargetRoot ? 'Root' : targetFolderName}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
