'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { UnifiedFile } from '@/lib/storage/types';
import { formatBytes, formatDate, getFileCategory } from '@/lib/utils';
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileCode, 
  Archive, 
  FileCheck, 
  File, 
  GripVertical, 
  MoreVertical,
  Download,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface FileItemProps {
  file: UnifiedFile;
  onOpenFolder: (folderId: string, folderName: string) => void;
  onPreview: (file: UnifiedFile) => void;
  onRename: (file: UnifiedFile) => void;
  onReplaceContent: (file: UnifiedFile) => void;
  onDelete: (file: UnifiedFile) => void;
  onClassify: (file: UnifiedFile) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  onOpenFolder,
  onPreview,
  onRename,
  onReplaceContent,
  onDelete,
  onClassify,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: file.id,
    data: { file },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
      }
    : undefined;

  const category = getFileCategory(file.mimeType, file.extension);

  const renderIcon = () => {
    switch (category) {
      case 'folder':
        return <Folder className="h-5 w-5 text-amber-400 fill-amber-400/20 shrink-0" />;
      case 'image':
        return <ImageIcon className="h-5 w-5 text-pink-400 shrink-0" />;
      case 'pdf':
        return <FileCheck className="h-5 w-5 text-red-400 shrink-0" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="h-5 w-5 text-emerald-400 shrink-0" />;
      case 'archive':
        return <Archive className="h-5 w-5 text-orange-400 shrink-0" />;
      case 'code':
        return <FileCode className="h-5 w-5 text-cyan-400 shrink-0" />;
      case 'document':
        return <FileText className="h-5 w-5 text-blue-400 shrink-0" />;
      default:
        return <File className="h-5 w-5 text-slate-400 shrink-0" />;
    }
  };

  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs select-none ${
        isDragging
          ? 'border-blue-500 bg-blue-500/20 shadow-2xl scale-105 cursor-grabbing'
          : 'border-white/5 bg-slate-900/40 hover:bg-slate-800/60 hover:border-white/15'
      }`}
    >
      {/* Left: Drag Handle + Icon + Name */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 transition-colors"
          title="Tarik untuk memindahkan atau menyalin"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Icon & Clickable Name */}
        <div
          onClick={() => {
            if (file.isFolder) {
              onOpenFolder(file.providerFileId, file.name);
            } else {
              onPreview(file);
            }
          }}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
        >
          {renderIcon()}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-200 truncate group-hover:text-white transition-colors" title={file.name}>
              {file.name}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {!file.isFolder && <span>{formatBytes(file.sizeBytes)}</span>}
              {!file.isFolder && <span>•</span>}
              <span>{formatDate(file.modifiedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions Menu */}
      <div className="flex items-center gap-1">
        {/* Quick Preview Button */}
        {!file.isFolder && (
          <button
            onClick={() => onPreview(file)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-all"
            title="Preview File"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Action Menu Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setMenuOpen(false)} 
              />

              {/* Menu list */}
              <div className="absolute right-0 mt-1 w-44 rounded-xl glass-panel border border-white/15 bg-slate-900/95 py-1 z-50 shadow-2xl backdrop-blur-xl">
                {!file.isFolder && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onPreview(file);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                  >
                    <Eye className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Lihat / Preview</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onRename(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                >
                  <Edit2 className="h-3.5 w-3.5 text-amber-400" />
                  <span>Ubah Nama</span>
                </button>

                {!file.isFolder && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onReplaceContent(file);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Ganti Isi File</span>
                  </button>
                )}

                {!file.isFolder && (
                  <a
                    href={`/api/v1/files/${file.providerFileId}/download?account=${file.accountId}`}
                    download={file.name}
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                  >
                    <Download className="h-3.5 w-3.5 text-blue-400" />
                    <span>Unduh (Stream)</span>
                  </a>
                )}

                {!file.isFolder && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onClassify(file);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-indigo-300 hover:text-indigo-100 hover:bg-indigo-500/20 transition-colors text-left"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                    <span>Cek Smart Auto-Org</span>
                  </button>
                )}

                <div className="my-1 border-t border-white/5" />

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 transition-colors text-left"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
