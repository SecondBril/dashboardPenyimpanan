'use client';

import React, { useState } from 'react';
import { UnifiedFile, AccountInfo, TransferOperation } from '@/lib/storage/types';
import { formatBytes } from '@/lib/utils';
import { ArrowRight, Copy, Move, X, Loader2, CheckCircle2 } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: UnifiedFile | null;
  destAccount: AccountInfo | null;
  destFolderId: string | null;
  onConfirm: (operation: TransferOperation) => Promise<void>;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  file,
  destAccount,
  destFolderId,
  onConfirm,
}) => {
  const [operation, setOperation] = useState<TransferOperation>('move');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !file || !destAccount) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(operation);
      onClose();
    } catch (err) {
      console.error('Transfer submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl glass-panel border border-white/15 bg-slate-900/95 p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title */}
        <h3 className="text-base font-bold text-white mb-1">
          Transfer File Antar Akun Cloud
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Tentukan jenis operasi transfer lintas provider ini.
        </p>

        {/* Transfer Visual Route */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 mb-5">
          <p className="text-xs font-semibold text-slate-200 truncate mb-2">
            📄 {file.name}
          </p>
          <div className="flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">Dari:</span>
              <span className="font-medium text-slate-300">{file.accountLabel}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-cyan-400 shrink-0" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-500 uppercase">Tujuan:</span>
              <span className="font-medium text-cyan-400">{destAccount.label}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ukuran File:</span>
            <span className="font-medium text-slate-200">{formatBytes(file.sizeBytes)}</span>
          </div>
        </div>

        {/* Operation Choice: Move vs Copy */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-medium text-slate-300">Pilih Operasi:</label>
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
              <span className="text-[10px] font-normal text-slate-500">Hapus file di sumber</span>
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
              <span className="text-[10px] font-normal text-slate-500">Pertahankan file sumber</span>
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
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Mulai Transfer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
