'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  DragOverlay, 
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor
} from '@dnd-kit/core';
import { 
  AccountInfo, 
  UnifiedFile, 
  TransferJob, 
  NotificationItem, 
  TransferOperation 
} from '@/lib/storage/types';
import { Header } from '@/components/Header';
import { StorageSummaryBar } from '@/components/StorageSummaryBar';
import { AccountColumn } from '@/components/AccountColumn';
import { TransferModal } from '@/components/TransferModal';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { NewFolderModal } from '@/components/NewFolderModal';
import { UploadModal } from '@/components/UploadModal';
import { RenameModal } from '@/components/RenameModal';
import { ReplaceContentModal } from '@/components/ReplaceContentModal';
import { TransferQueueDrawer } from '@/components/TransferQueueDrawer';
import { SmartOrganizationModal } from '@/components/SmartOrganizationModal';
import { NotificationPopover } from '@/components/NotificationPopover';
import { formatBytes, getFileCategory } from '@/lib/utils';
import { FileText, Folder, Sparkles, MoveRight } from 'lucide-react';

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [accountFiles, setAccountFiles] = useState<Record<string, UnifiedFile[]>>({});
  const [loadingAccounts, setLoadingAccounts] = useState<Record<string, boolean>>({});
  const [storageSummary, setStorageSummary] = useState<any>(null);
  const [transferJobs, setTransferJobs] = useState<TransferJob[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'tabs'>('grid');
  const [selectedTabAccountId, setSelectedTabAccountId] = useState<string>('');

  // Drag & Drop Active Item
  const [activeDraggedFile, setActiveDraggedFile] = useState<UnifiedFile | null>(null);

  // Modals
  const [transferModalData, setTransferModalData] = useState<{
    isOpen: boolean;
    file: UnifiedFile | null;
    destAccount: AccountInfo | null;
    destFolderId: string | null;
  }>({
    isOpen: false,
    file: null,
    destAccount: null,
    destFolderId: null,
  });

  const [previewFile, setPreviewFile] = useState<UnifiedFile | null>(null);
  const [newFolderTarget, setNewFolderTarget] = useState<{ accountId: string; folderId: string | null } | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ accountId: string; folderId: string | null } | null>(null);
  const [renameTarget, setRenameTarget] = useState<UnifiedFile | null>(null);
  const [replaceContentTarget, setReplaceContentTarget] = useState<UnifiedFile | null>(null);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Sensors for DND
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px drag tolerance before activating
      },
    })
  );

  // 1. Load Accounts
  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/accounts');
      if (res.ok) {
        const d = await res.json();
        setAccounts(d.accounts || []);
        if (d.accounts && d.accounts.length > 0 && !selectedTabAccountId) {
          setSelectedTabAccountId(d.accounts[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  }, [selectedTabAccountId]);

  // 2. Load Files for an Account
  const loadAccountFiles = useCallback(async (accountId: string, folderId: string | null = null) => {
    setLoadingAccounts((prev) => ({ ...prev, [accountId]: true }));
    try {
      const url = folderId 
        ? `/api/v1/files?account=${accountId}&folder=${folderId}` 
        : `/api/v1/files?account=${accountId}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setAccountFiles((prev) => ({ ...prev, [accountId]: d.items || [] }));
      }
    } catch (err) {
      console.error(`Failed to load files for account ${accountId}:`, err);
    } finally {
      setLoadingAccounts((prev) => ({ ...prev, [accountId]: false }));
    }
  }, []);

  // 3. Load Storage Summary
  const loadStorageSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/storage-summary');
      if (res.ok) {
        const d = await res.json();
        setStorageSummary(d.summary);
      }
    } catch (err) {
      console.error('Failed to load storage summary:', err);
    }
  }, []);

  // 4. Load Transfer Jobs
  const loadTransferJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/transfer');
      if (res.ok) {
        const d = await res.json();
        setTransferJobs(d.jobs || []);
      }
    } catch (err) {
      console.error('Failed to load transfer jobs:', err);
    }
  }, []);

  // 5. Load Notifications
  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications');
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications || []);
        setUnreadNotifsCount(d.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  // Refresh All
  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    await Promise.all([
      loadAccounts(),
      loadStorageSummary(),
      loadTransferJobs(),
      loadNotifications(),
      ...accounts.map((a) => loadAccountFiles(a.id)),
    ]);
    setIsRefreshingAll(false);
  };

  // Initial Load
  useEffect(() => {
    loadAccounts();
    loadStorageSummary();
    loadTransferJobs();
    loadNotifications();
  }, [loadAccounts, loadStorageSummary, loadTransferJobs, loadNotifications]);

  // Load files when accounts are available
  useEffect(() => {
    if (accounts.length > 0) {
      accounts.forEach((acc) => {
        loadAccountFiles(acc.id);
      });
    }
  }, [accounts, loadAccountFiles]);

  // Periodic poll for transfer jobs progress (every 4 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      loadTransferJobs();
      loadNotifications();
    }, 4000);
    return () => clearInterval(timer);
  }, [loadTransferJobs, loadNotifications]);

  // --- Drag and Drop Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const file = event.active.data.current?.file as UnifiedFile | undefined;
    if (file) {
      setActiveDraggedFile(file);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDraggedFile(null);

    if (!over) return;

    const file = active.data.current?.file as UnifiedFile | undefined;
    const destAccount = over.data.current?.account as AccountInfo | undefined;
    const destFolderId = over.data.current?.currentFolderId as string | null;

    if (!file || !destAccount) return;

    // Check if dropping onto the same account and same folder
    if (file.accountId === destAccount.id && file.parentId === destFolderId) {
      return;
    }

    // Open confirmation modal
    setTransferModalData({
      isOpen: true,
      file,
      destAccount,
      destFolderId,
    });
  };

  // Confirm Transfer Execution
  const handleConfirmTransfer = async (operation: TransferOperation) => {
    if (!transferModalData.file || !transferModalData.destAccount) return;

    const file = transferModalData.file;
    const destAccount = transferModalData.destAccount;
    const destFolderId = transferModalData.destFolderId;

    try {
      const res = await fetch('/api/v1/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAccountId: file.accountId,
          destAccountId: destAccount.id,
          sourceFileId: file.providerFileId || (file.id.includes(':') ? file.id.split(':').slice(1).join(':') : file.id),
          destParentId: destFolderId ? (destFolderId.includes(':') ? destFolderId.split(':').slice(1).join(':') : destFolderId) : null,
          operation,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Transfer failed');
      }

      // Immediately refresh jobs and file lists
      await Promise.all([
        loadTransferJobs(),
        loadAccountFiles(file.accountId),
        loadAccountFiles(destAccount.id),
        loadStorageSummary(),
      ]);
    } catch (err: any) {
      alert(`Gagal memulai transfer: ${err?.message}`);
    }
  };

  // Manual Trigger Smart Classify
  const handleClassifyFile = async (file: UnifiedFile) => {
    try {
      const res = await fetch('/api/v1/organization/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          accountId: file.accountId,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        loadNotifications();
        loadAccounts();
        accounts.forEach((a) => loadAccountFiles(a.id));
        if (d.job?.action === 'auto_moved') {
          alert(`File "${file.name}" otomatis dipindahkan ke ${d.job.predictedTargetFolderName}! Anda dapat membatalkannya melalui menu Notifikasi.`);
        } else if (d.job?.action === 'suggested') {
          alert(`Saran pemindahan dibuat untuk "${file.name}". Buka lonceng notifikasi untuk menyetujui.`);
        } else {
          alert(`File "${file.name}" sudah berada di folder yang sesuai.`);
        }
      }
    } catch (err) {
      console.error('Classification trigger error:', err);
    }
  };

  // Delete File Action
  const handleDeleteFile = async (file: UnifiedFile) => {
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus "${file.name}" dari ${file.accountLabel}?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/v1/files/${file.providerFileId}?account=${file.accountId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadAccountFiles(file.accountId);
        loadStorageSummary();
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal menghapus file');
      }
    } catch (err: any) {
      alert(`Gagal menghapus file: ${err?.message}`);
    }
  };

  // Notification actions
  const handleMarkAllNotifsRead = async () => {
    await fetch('/api/v1/notifications', { method: 'POST' });
    loadNotifications();
  };

  const handleMarkNotifRead = async (id: string) => {
    await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
    loadNotifications();
  };

  const handleUndoNotification = async (jobId: string) => {
    const res = await fetch(`/api/v1/organization/jobs/${jobId}/undo`, { method: 'POST' });
    if (res.ok) {
      loadNotifications();
      accounts.forEach((a) => loadAccountFiles(a.id));
      loadStorageSummary();
    }
  };

  const handleApproveNotification = async (jobId: string) => {
    const res = await fetch(`/api/v1/organization/jobs/${jobId}/approve`, { method: 'POST' });
    if (res.ok) {
      loadNotifications();
      accounts.forEach((a) => loadAccountFiles(a.id));
      loadStorageSummary();
    }
  };

  const activeTransfersCount = transferJobs.filter(
    (j) => j.status === 'queued' || j.status === 'downloading' || j.status === 'uploading'
  ).length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen flex flex-col relative text-slate-100 pb-12">
        {/* Header Bar */}
        <Header
          onOpenOrgModal={() => setIsOrgModalOpen(true)}
          onOpenTransferDrawer={() => setIsTransferDrawerOpen(true)}
          onToggleNotifications={() => setIsNotificationOpen(!isNotificationOpen)}
          unreadNotifsCount={unreadNotifsCount}
          activeTransfersCount={activeTransfersCount}
          onRefreshAll={handleRefreshAll}
          isRefreshing={isRefreshingAll}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode(viewMode === 'grid' ? 'tabs' : 'grid')}
        />

        {/* In-App Notification Popover */}
        <NotificationPopover
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllNotifsRead}
          onMarkAsRead={handleMarkNotifRead}
          onUndo={handleUndoNotification}
          onApprove={handleApproveNotification}
        />

        {/* Main Content Area */}
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full flex-1 flex flex-col">
          
          {/* Storage Quota Summary Visualizer */}
          <StorageSummaryBar summary={storageSummary} />

          {/* Quick Tip Banner */}
          <div className="mb-4 px-4 py-2.5 rounded-xl glass-panel border border-white/5 bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-500/20 text-cyan-300 font-bold">TIPS</span>
              <span>
                Tarik (drag) file dari kolom akun manapun dan letakkan (drop) ke kolom akun lain untuk transfer streaming antar provider.
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span>Smart Classifier siap mengatur file secara otomatis</span>
            </div>
          </div>

          {/* Tab buttons for mobile or single-tab mode */}
          {viewMode === 'tabs' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedTabAccountId(acc.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    selectedTabAccountId === acc.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'glass-panel text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: acc.colorCode }}
                  />
                  <span>{acc.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Multi-Account File Browser */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-1">
              {accounts.map((account) => (
                <AccountColumn
                  key={account.id}
                  account={account}
                  files={accountFiles[account.id] || []}
                  isLoading={loadingAccounts[account.id] || false}
                  onRefresh={(accId, folderId) => loadAccountFiles(accId, folderId)}
                  onOpenNewFolderModal={(accId, folderId) =>
                    setNewFolderTarget({ accountId: accId, folderId })
                  }
                  onOpenUploadModal={(accId, folderId) =>
                    setUploadTarget({ accountId: accId, folderId })
                  }
                  onPreviewFile={(f) => setPreviewFile(f)}
                  onRenameFile={(f) => setRenameTarget(f)}
                  onReplaceContent={(f) => setReplaceContentTarget(f)}
                  onDeleteFile={handleDeleteFile}
                  onClassifyFile={handleClassifyFile}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full flex-1">
              {accounts
                .filter((a) => a.id === selectedTabAccountId)
                .map((account) => (
                  <AccountColumn
                    key={account.id}
                    account={account}
                    files={accountFiles[account.id] || []}
                    isLoading={loadingAccounts[account.id] || false}
                    onRefresh={(accId, folderId) => loadAccountFiles(accId, folderId)}
                    onOpenNewFolderModal={(accId, folderId) =>
                      setNewFolderTarget({ accountId: accId, folderId })
                    }
                    onOpenUploadModal={(accId, folderId) =>
                      setUploadTarget({ accountId: accId, folderId })
                    }
                    onPreviewFile={(f) => setPreviewFile(f)}
                    onRenameFile={(f) => setRenameTarget(f)}
                    onReplaceContent={(f) => setReplaceContentTarget(f)}
                    onDeleteFile={handleDeleteFile}
                    onClassifyFile={handleClassifyFile}
                  />
                ))}
            </div>
          )}
        </main>

        {/* Drag Overlay (Visual representation of floating file during dragging) */}
        <DragOverlay>
          {activeDraggedFile ? (
            <div className="p-3 rounded-xl glass-panel border border-cyan-400 bg-slate-900/95 shadow-2xl flex items-center gap-2.5 text-xs text-white scale-105 pointer-events-none ring-2 ring-cyan-400/50">
              <MoveRight className="h-4 w-4 text-cyan-400 animate-pulse" />
              <div className="font-semibold truncate max-w-[200px]">
                {activeDraggedFile.name}
              </div>
              <span className="text-[10px] text-slate-400">
                ({formatBytes(activeDraggedFile.sizeBytes)})
              </span>
            </div>
          ) : null}
        </DragOverlay>

        {/* Modals */}
        <TransferModal
          isOpen={transferModalData.isOpen}
          onClose={() => setTransferModalData((prev) => ({ ...prev, isOpen: false }))}
          file={transferModalData.file}
          destAccount={transferModalData.destAccount}
          destFolderId={transferModalData.destFolderId}
          onConfirm={handleConfirmTransfer}
        />

        <FilePreviewModal
          isOpen={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
        />

        <NewFolderModal
          isOpen={Boolean(newFolderTarget)}
          onClose={() => setNewFolderTarget(null)}
          accountId={newFolderTarget?.accountId || null}
          parentId={newFolderTarget?.folderId || null}
          onCreated={() => {
            if (newFolderTarget) loadAccountFiles(newFolderTarget.accountId);
          }}
        />

        <UploadModal
          isOpen={Boolean(uploadTarget)}
          onClose={() => setUploadTarget(null)}
          accountId={uploadTarget?.accountId || null}
          parentId={uploadTarget?.folderId || null}
          onUploaded={() => {
            if (uploadTarget) {
              loadAccountFiles(uploadTarget.accountId);
              loadStorageSummary();
            }
          }}
        />

        <RenameModal
          isOpen={Boolean(renameTarget)}
          onClose={() => setRenameTarget(null)}
          file={renameTarget}
          onRenamed={() => {
            if (renameTarget) loadAccountFiles(renameTarget.accountId);
          }}
        />

        <ReplaceContentModal
          isOpen={Boolean(replaceContentTarget)}
          onClose={() => setReplaceContentTarget(null)}
          file={replaceContentTarget}
          onUpdated={() => {
            if (replaceContentTarget) loadAccountFiles(replaceContentTarget.accountId);
          }}
        />

        <TransferQueueDrawer
          isOpen={isTransferDrawerOpen}
          onClose={() => setIsTransferDrawerOpen(false)}
          jobs={transferJobs}
          onRefresh={loadTransferJobs}
        />

        <SmartOrganizationModal
          isOpen={isOrgModalOpen}
          onClose={() => setIsOrgModalOpen(false)}
          onRefreshData={() => {
            accounts.forEach((a) => loadAccountFiles(a.id));
            loadStorageSummary();
          }}
        />
      </div>
    </DndContext>
  );
}
