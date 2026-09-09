'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { UnifiedFile, AccountInfo } from '@/lib/storage/types';
import { FileItem } from './FileItem';
import { 
  FolderPlus, 
  Upload, 
  Search, 
  ChevronRight, 
  Home, 
  FolderOpen, 
  HardDrive,
  RefreshCw
} from 'lucide-react';

interface AccountColumnProps {
  account: AccountInfo;
  files: UnifiedFile[];
  isLoading: boolean;
  onRefresh: (accountId: string, folderId?: string | null) => void;
  onOpenNewFolderModal: (accountId: string, currentFolderId: string | null) => void;
  onOpenUploadModal: (accountId: string, currentFolderId: string | null) => void;
  onPreviewFile: (file: UnifiedFile) => void;
  onRenameFile: (file: UnifiedFile) => void;
  onReplaceContent: (file: UnifiedFile) => void;
  onDeleteFile: (file: UnifiedFile) => void;
  onClassifyFile: (file: UnifiedFile) => void;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export const AccountColumn: React.FC<AccountColumnProps> = ({
  account,
  files,
  isLoading,
  onRefresh,
  onOpenNewFolderModal,
  onOpenUploadModal,
  onPreviewFile,
  onRenameFile,
  onReplaceContent,
  onDeleteFile,
  onClassifyFile,
}) => {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: 'Root' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  // Droppable container for this account
  const { isOver, setNodeRef } = useDroppable({
    id: account.id,
    data: {
      account,
      currentFolderId: currentFolder.id,
    },
  });

  const handleOpenFolder = (folderId: string, folderName: string) => {
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
    onRefresh(account.id, folderId);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    onRefresh(account.id, target.id);
  };

  // Filter files by folder and search query (files are already loaded from the storage adapter for this folder)
  const filteredFiles = files.filter((f) => {
    if (searchQuery.trim()) {
      return f.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    // If inside a subfolder, ensure parentId matches if present
    if (currentFolder.id !== null && f.parentId && f.parentId !== currentFolder.id) {
      return false;
    }
    return true;
  });

  const isGoogle = account.provider === 'google_drive';

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-[750px] rounded-2xl glass-panel border transition-all duration-300 shadow-xl overflow-hidden relative ${
        isOver
          ? 'border-cyan-400 ring-2 ring-cyan-400/40 bg-cyan-950/20 scale-[1.01]'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Drop Zone Visual Indicator Overlay */}
      {isOver && (
        <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-cyan-400 rounded-2xl">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-400 shadow-2xl flex flex-col items-center gap-2">
            <Upload className="h-7 w-7 text-cyan-400 animate-bounce" />
            <p className="text-sm font-bold text-white">Lepaskan untuk Pindahkan / Salin</p>
            <p className="text-xs text-slate-400">Ke: {account.label} &gt; {currentFolder.name}</p>
          </div>
        </div>
      )}

      {/* Column Header */}
      <div 
        className="p-3.5 border-b border-white/10 bg-slate-900/80 backdrop-blur-md"
        style={{ borderTop: `3px solid ${account.colorCode}` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-3 w-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: account.colorCode }}
            />
            <h2 className="text-xs font-bold text-white truncate" title={account.label}>
              {account.label}
            </h2>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 shrink-0">
            {isGoogle ? 'Google Drive' : 'OneDrive'}
          </span>
        </div>

        {/* Toolbar: Breadcrumb + Refresh */}
        <div className="flex items-center justify-between gap-1 text-xs text-slate-400 mb-2">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar flex-1">
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />}
                <button
                  onClick={() => handleNavigateBreadcrumb(idx)}
                  className={`truncate hover:text-white transition-colors shrink-0 ${
                    idx === breadcrumbs.length - 1 ? 'font-semibold text-cyan-400' : ''
                  }`}
                >
                  {idx === 0 ? <Home className="h-3 w-3 inline mr-1" /> : null}
                  {b.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          <button
            onClick={() => onRefresh(account.id, currentFolder.id)}
            disabled={isLoading}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Refresh folder ini"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Search Bar & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>
          <button
            onClick={() => onOpenNewFolderModal(account.id, currentFolder.id)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-colors shrink-0"
            title="Folder Baru"
          >
            <FolderPlus className="h-3.5 w-3.5 text-amber-400" />
          </button>
          <button
            onClick={() => onOpenUploadModal(account.id, currentFolder.id)}
            className="p-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/30 transition-colors shrink-0"
            title="Upload File Baru"
          >
            <Upload className="h-3.5 w-3.5 text-blue-400" />
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
            <span className="text-xs">Memuat file...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
            <FolderOpen className="h-10 w-10 text-slate-600 stroke-[1.5]" />
            <p className="text-xs font-medium text-slate-400">
              {searchQuery ? 'Tidak ada file yang cocok' : 'Folder ini masih kosong'}
            </p>
            <p className="text-[11px] text-slate-600">
              Tarik file ke kolom ini untuk memindahkan/menyalin
            </p>
          </div>
        ) : (
          filteredFiles.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onOpenFolder={handleOpenFolder}
              onPreview={onPreviewFile}
              onRename={onRenameFile}
              onReplaceContent={onReplaceContent}
              onDelete={onDeleteFile}
              onClassify={onClassifyFile}
            />
          ))
        )}
      </div>

      {/* Column Footer: File Counter */}
      <div className="px-3.5 py-2 border-t border-white/5 bg-slate-950/40 text-[11px] text-slate-500 flex items-center justify-between">
        <span>{filteredFiles.length} item</span>
        <span className="text-[10px] text-slate-600">Drop target siap</span>
      </div>
    </div>
  );
};
