export type StorageProvider = 'google_drive' | 'onedrive';

export interface UnifiedFile {
  id: string; // Unified unique ID (usually accountId:providerFileId or providerFileId)
  providerFileId: string; // Raw ID in the underlying provider
  accountId: string; // Account ID owning this file
  accountLabel: string;
  provider: StorageProvider;
  name: string;
  mimeType: string;
  sizeBytes: number;
  parentId: string | null;
  isFolder: boolean;
  previewUrl?: string;
  downloadUrl?: string;
  modifiedAt: string;
  extension?: string;
  tags?: string[];
}

export interface StorageQuota {
  usedBytes: number;
  limitBytes: number;
  usedPercentage: number;
}

export interface AccountInfo {
  id: string;
  provider: StorageProvider;
  label: string;
  email: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  colorCode: string;
  status: 'connected' | 'needs_reauth' | 'disconnected';
  tokenExpiry?: string;
}

export interface UploadOptions {
  name: string;
  mimeType: string;
  sizeBytes?: number;
  parentId?: string | null;
  content: ReadableStream<Uint8Array> | Buffer | Blob | string;
}

export interface StorageAdapter {
  provider: StorageProvider;
  accountId: string;

  listFiles(folderId?: string | null): Promise<UnifiedFile[]>;
  getFile(fileId: string): Promise<UnifiedFile | null>;
  createFolder(name: string, parentId?: string | null): Promise<UnifiedFile>;
  uploadFile(options: UploadOptions): Promise<UnifiedFile>;
  updateContent(fileId: string, content: ReadableStream<Uint8Array> | Buffer | string): Promise<void>;
  rename(fileId: string, newName: string): Promise<UnifiedFile>;
  deleteFile(fileId: string): Promise<void>;
  downloadStream(fileId: string): Promise<ReadableStream<Uint8Array> | Buffer>;
  getStorageQuota(): Promise<StorageQuota>;
  searchFiles(query: string, folderId?: string | null): Promise<UnifiedFile[]>;
}

export type TransferOperation = 'copy' | 'move';
export type TransferStatus = 'queued' | 'downloading' | 'uploading' | 'done' | 'failed' | 'cancelled';

export interface TransferJob {
  id: string;
  sourceAccountId: string;
  sourceAccountLabel: string;
  destAccountId: string;
  destAccountLabel: string;
  sourceFileId: string;
  destParentId: string | null;
  fileName: string;
  operation: TransferOperation;
  status: TransferStatus;
  bytesTransferred: number;
  totalBytes: number;
  progressPercent: number;
  errorLog?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConditionType = 'mime_type' | 'filename_keyword' | 'extension';

export interface OrganizationRule {
  id: string;
  name: string;
  conditionType: ConditionType;
  conditionValue: string;
  sourceFolderFilter?: string;
  targetAccountId: string;
  targetAccountLabel: string;
  targetFolderId: string;
  targetFolderName: string;
  enabled: boolean;
  createdAt: string;
}

export type ClassificationAction = 'auto_moved' | 'suggested' | 'ignored' | 'undone';

export interface ClassificationJob {
  id: string;
  fileIndexId?: string;
  fileName: string;
  method: 'rule' | 'ai';
  predictedTargetAccountId: string;
  predictedTargetAccountLabel: string;
  predictedTargetFolderId: string;
  predictedTargetFolderName: string;
  confidence: number;
  action: ClassificationAction;
  originalAccountId: string;
  originalFolderId: string | null;
  originalFileId: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  classificationJobId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'action_required';
  channel: 'in_app' | 'email' | 'telegram';
  isRead: boolean;
  createdAt: string;
  actionData?: {
    canUndo?: boolean;
    canApprove?: boolean;
    classificationJobId?: string;
    sourceAccountId?: string;
    destAccountId?: string;
    fileId?: string;
  };
}

export interface SystemSettings {
  autoMoveThreshold: number; // default 0.85
  suggestThreshold: number; // default 0.50
  excludedFolders: string[];
  notificationChannels: string[];
}
