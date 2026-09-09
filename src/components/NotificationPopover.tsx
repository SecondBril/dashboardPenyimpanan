'use client';

import React from 'react';
import { NotificationItem } from '@/lib/storage/types';
import { formatDate } from '@/lib/utils';
import { 
  X, 
  Bell, 
  Check, 
  CheckCheck, 
  RotateCcw, 
  Sparkles, 
  Info, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onUndo: (classificationJobId: string) => Promise<void>;
  onApprove: (classificationJobId: string) => Promise<void>;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onUndo,
  onApprove,
}) => {
  const [loadingActionId, setLoadingActionId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleUndoClick = async (jobId: string) => {
    setLoadingActionId(jobId);
    try {
      await onUndo(jobId);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleApproveClick = async (jobId: string) => {
    setLoadingActionId(jobId);
    try {
      await onApprove(jobId);
    } finally {
      setLoadingActionId(null);
    }
  };

  return (
    <div className="fixed inset-x-3 sm:inset-x-auto sm:right-4 top-16 z-50 w-auto sm:w-full sm:max-w-md rounded-2xl glass-panel border border-white/15 bg-slate-900/98 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[80vh] sm:max-h-[550px]">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-pink-400" />
          <h4 className="text-sm font-bold text-white">Notifikasi & Peringatan</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllAsRead}
            className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Tandai dibaca</span>
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Tidak ada notifikasi baru
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (!notif.isRead) onMarkAsRead(notif.id);
              }}
              className={`p-3 rounded-xl border text-xs transition-all relative ${
                notif.isRead
                  ? 'bg-slate-950/40 border-white/5 opacity-75'
                  : 'bg-slate-950/80 border-cyan-500/30 shadow-md ring-1 ring-cyan-500/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      notif.type === 'action_required'
                        ? 'bg-amber-400 animate-ping'
                        : notif.type === 'success'
                        ? 'bg-emerald-400'
                        : 'bg-blue-400'
                    }`}
                  />
                  <h5 className="font-bold text-white truncate">{notif.title}</h5>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {formatDate(notif.createdAt)}
                </span>
              </div>

              <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                {notif.message}
              </p>

              {/* Action Buttons: Undo / Approve */}
              {notif.actionData && (
                <div className="flex items-center gap-2 pt-1">
                  {notif.actionData.canUndo && notif.actionData.classificationJobId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUndoClick(notif.actionData!.classificationJobId!);
                      }}
                      disabled={loadingActionId === notif.actionData.classificationJobId}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 transition-all active:scale-95"
                    >
                      {loadingActionId === notif.actionData.classificationJobId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      <span>Undo Pemindahan</span>
                    </button>
                  )}

                  {notif.actionData.canApprove && notif.actionData.classificationJobId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproveClick(notif.actionData!.classificationJobId!);
                      }}
                      disabled={loadingActionId === notif.actionData.classificationJobId}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all active:scale-95"
                    >
                      {loadingActionId === notif.actionData.classificationJobId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      <span>Setujui Pemindahan</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
