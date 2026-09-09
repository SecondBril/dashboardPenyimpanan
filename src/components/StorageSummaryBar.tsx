'use client';

import React from 'react';
import { formatBytes } from '@/lib/utils';
import { HardDrive, CheckCircle2, ShieldCheck, Database } from 'lucide-react';

interface StorageAccountSummary {
  account: {
    id: string;
    label: string;
    provider: string;
    email: string;
    colorCode: string;
  };
  quota: {
    usedBytes: number;
    limitBytes: number;
    usedPercentage: number;
  };
}

interface StorageSummaryBarProps {
  summary: {
    totalUsedBytes: number;
    totalLimitBytes: number;
    totalPercentage: number;
    accounts: StorageAccountSummary[];
  } | null;
}

export const StorageSummaryBar: React.FC<StorageSummaryBarProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div className="w-full h-24 rounded-2xl glass-panel animate-pulse p-4 border border-white/5 flex items-center justify-center">
        <span className="text-xs text-slate-400">Memuat status kapasitas penyimpanan multi-cloud...</span>
      </div>
    );
  }

  return (
    <div className="w-full mb-6 space-y-3">
      {/* Top Banner: Aggregate Quota */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Database className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Kapasitas Gabungan ({summary.accounts.length} Akun)
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  Free Tier Protected
                </span>
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-white">
                {formatBytes(summary.totalUsedBytes)}{' '}
                <span className="text-xs sm:text-sm font-normal text-slate-400">
                  terpakai dari {formatBytes(summary.totalLimitBytes)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              {summary.totalPercentage}%
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 transition-all duration-700 ease-out"
            style={{ width: `${Math.max(2, summary.totalPercentage)}%` }}
          />
        </div>
      </div>

      {/* Individual Account Cards Responsive Grid (fits 4 accounts smoothly) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
        {summary.accounts.map(({ account, quota }) => {
          const isGoogle = account.provider === 'google_drive';
          return (
            <div
              key={account.id}
              className="glass-panel rounded-xl p-3 sm:p-3.5 border border-white/5 hover:border-white/15 transition-all shadow-md group relative overflow-hidden"
            >
              {/* Subtle top indicator bar matching account color */}
              <div
                className="absolute top-0 left-0 right-0 h-1 opacity-75"
                style={{ backgroundColor: account.colorCode }}
              />

              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: account.colorCode }}
                    />
                    <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                      {account.label}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{account.email}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 uppercase tracking-wider shrink-0">
                  {isGoogle ? 'Google Drive' : 'OneDrive'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">
                  {formatBytes(quota.usedBytes)} / {formatBytes(quota.limitBytes)}
                </span>
                <span className="font-semibold text-slate-200">
                  {quota.usedPercentage}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(3, quota.usedPercentage)}%`,
                    backgroundColor: account.colorCode,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
