'use client';

import React from 'react';
import { 
  Cloud, 
  Sparkles, 
  ArrowLeftRight, 
  Bell, 
  Layers, 
  CheckCircle2, 
  RefreshCw,
  FolderSync
} from 'lucide-react';

interface HeaderProps {
  onOpenOrgModal: () => void;
  onOpenTransferDrawer: () => void;
  onToggleNotifications: () => void;
  unreadNotifsCount: number;
  activeTransfersCount: number;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  viewMode: 'grid' | 'tabs';
  onToggleViewMode: () => void;
  accountsCount?: { gdrive: number; onedrive: number };
}

export const Header: React.FC<HeaderProps> = ({
  onOpenOrgModal,
  onOpenTransferDrawer,
  onToggleNotifications,
  unreadNotifsCount,
  activeTransfersCount,
  onRefreshAll,
  isRefreshing,
  viewMode,
  onToggleViewMode,
  accountsCount = { gdrive: 3, onedrive: 1 },
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 glass-panel shadow-2xl">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand & Multi-Cloud Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <div className="h-full w-full bg-slate-950/80 rounded-[10px] flex items-center justify-center">
              <Cloud className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 animate-pulse-subtle" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent truncate">
                Multi-Cloud Hub
              </h1>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                v2.0
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 truncate">
              <span className="flex items-center gap-1 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-emerald-400 font-medium">{accountsCount.gdrive}x Google Drive</span>
              </span>
              <span>•</span>
              <span className="text-sky-400 font-medium shrink-0">{accountsCount.onedrive}x OneDrive</span>
              <span className="hidden md:inline text-slate-500 truncate">• Ready for Personal Transfer</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Refresh button */}
          <button
            id="btn-refresh-all"
            onClick={onRefreshAll}
            disabled={isRefreshing}
            title="Refresh semua akun"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/5 active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* View mode toggle (Grid vs Tabs - available on all screen sizes!) */}
          <button
            id="btn-toggle-view"
            onClick={onToggleViewMode}
            title="Ubah Tampilan Grid / Tab"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/5"
          >
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{viewMode === 'grid' ? 'Tampilan Grid' : 'Tampilan Tab'}</span>
            <span className="sm:hidden">{viewMode === 'grid' ? 'Grid' : 'Tab'}</span>
          </button>

          {/* Smart Auto-Organization Modal Trigger */}
          <button
            id="btn-smart-org"
            onClick={onOpenOrgModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 hover:from-indigo-500/30 hover:to-pink-500/30 text-indigo-200 border border-indigo-500/30 transition-all shadow-sm active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-pink-400" />
            <span className="hidden sm:inline">Smart Auto-Org</span>
            <span className="sm:hidden">Auto</span>
          </button>

          {/* Transfer Queue Trigger */}
          <button
            id="btn-transfer-queue"
            onClick={onOpenTransferDrawer}
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden md:inline">Antrian Transfer</span>
            {activeTransfersCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-blue-600 rounded-full animate-pulse">
                {activeTransfersCount}
              </span>
            )}
          </button>

          {/* Notifications Bell */}
          <button
            id="btn-notifications"
            onClick={onToggleNotifications}
            className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/5 active:scale-95"
            title="Notifikasi & Riwayat Undo"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[9px] font-bold text-white shadow-lg shadow-pink-500/50">
                {unreadNotifsCount}
              </span>
            )}
          </button>

        </div>
      </div>
    </header>
  );
};
