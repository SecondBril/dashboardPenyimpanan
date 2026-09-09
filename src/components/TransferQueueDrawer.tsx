'use client';

import React from 'react';
import { TransferJob } from '@/lib/storage/types';
import { formatBytes, formatDate } from '@/lib/utils';
import { 
  X, 
  ArrowLeftRight, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2 
} from 'lucide-react';

interface TransferQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: TransferJob[];
  onRefresh: () => void;
}

export const TransferQueueDrawer: React.FC<TransferQueueDrawerProps> = ({
  isOpen,
  onClose,
  jobs,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full glass-panel border-l border-white/15 bg-slate-900/98 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Antrian Transfer File</h3>
              <p className="text-[11px] text-slate-400">
                {jobs.length} riwayat pekerjaan transfer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Jobs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {jobs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
              <ArrowLeftRight className="h-10 w-10 text-slate-700 stroke-[1.5] mb-2" />
              <p className="text-xs font-semibold text-slate-300">Belum Ada Antrian</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Tarik file antar kolom akun untuk memulai transfer streaming.
              </p>
            </div>
          ) : (
            jobs.map((job) => {
              const isDone = job.status === 'done';
              const isFailed = job.status === 'failed';
              const isRunning = job.status === 'downloading' || job.status === 'uploading' || job.status === 'queued';

              return (
                <div
                  key={job.id}
                  className="p-3.5 rounded-xl glass-panel border border-white/10 bg-slate-950/60 shadow-md space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-white truncate flex-1" title={job.fileName}>
                      {job.fileName}
                    </p>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        job.operation === 'move'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                      }`}
                    >
                      {job.operation === 'move' ? 'Move' : 'Copy'}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[130px]">{job.sourceAccountLabel}</span>
                    <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
                    <span className="truncate max-w-[130px] font-medium text-cyan-300">{job.destAccountLabel}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        {isRunning && <Loader2 className="h-3 w-3 animate-spin text-blue-400" />}
                        {isDone && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                        {isFailed && <AlertCircle className="h-3 w-3 text-rose-400" />}
                        <span className="capitalize">{job.status}</span>
                      </span>
                      <span>{job.progressPercent}%</span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDone
                            ? 'bg-emerald-400'
                            : isFailed
                            ? 'bg-rose-500'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                        }`}
                        style={{ width: `${job.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {job.errorLog && (
                    <p className="text-[10px] text-rose-400 bg-rose-500/10 p-1.5 rounded-lg">
                      {job.errorLog}
                    </p>
                  )}

                  <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                    <span>{formatBytes(job.totalBytes)}</span>
                    <span>{formatDate(job.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Resumable Transfer Engine Active</span>
          <button
            onClick={onRefresh}
            className="hover:text-white text-cyan-400 transition-colors"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
};
