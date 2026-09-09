import { StorageAdapter, StorageProvider, UnifiedFile, StorageQuota, UploadOptions } from './types';

// In-memory file repository for development and demo mode
interface MockFileRecord extends UnifiedFile {
  contentData?: string;
}

// Initial mock database across all 4 accounts
const MOCK_FILES: MockFileRecord[] = [
  // --- Google Drive A (Utama / Kerja) ---
  {
    id: 'gda_fld_1',
    providerFileId: 'gda_fld_1',
    accountId: 'a0000000-0000-0000-0000-000000000001',
    accountLabel: 'Google Drive A (Utama)',
    provider: 'google_drive',
    name: 'Dokumen Proyek PKL',
    mimeType: 'application/vnd.google-apps.folder',
    sizeBytes: 0,
    parentId: null,
    isFolder: true,
    modifiedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'gda_fld_2',
    providerFileId: 'gda_fld_2',
    accountId: 'a0000000-0000-0000-0000-000000000001',
    accountLabel: 'Google Drive A (Utama)',
    provider: 'google_drive',
    name: 'Keuangan & Invoice',
    mimeType: 'application/vnd.google-apps.folder',
    sizeBytes: 0,
    parentId: null,
    isFolder: true,
    modifiedAt: '2026-09-02T11:30:00Z',
  },
  {
    id: 'gda_fil_1',
    providerFileId: 'gda_fil_1',
    accountId: 'a0000000-0000-0000-0000-000000000001',
    accountLabel: 'Google Drive A (Utama)',
    provider: 'google_drive',
    name: 'Laporan_PKL_MultiCloud_Hub.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 3450000,
    parentId: 'gda_fld_1',
    isFolder: false,
    previewUrl: 'https://docs.google.com/viewer?url=sample.pdf',
    modifiedAt: '2026-09-08T14:15:00Z',
    extension: 'pdf',
    contentData: 'Ringkasan Laporan PKL Multi-Cloud Storage Hub.',
  },
  {
    id: 'gda_fil_2',
    providerFileId: 'gda_fil_2',
    accountId: 'a0000000-0000-0000-0000-000000000001',
    accountLabel: 'Google Drive A (Utama)',
    provider: 'google_drive',
    name: 'SRS_Arsitektur_Sistem.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 1250000,
    parentId: 'gda_fld_1',
    isFolder: false,
    previewUrl: 'https://docs.google.com/document/d/sample',
    modifiedAt: '2026-09-07T09:00:00Z',
    extension: 'docx',
  },
  {
    id: 'gda_fil_3',
    providerFileId: 'gda_fil_3',
    accountId: 'a0000000-0000-0000-0000-000000000001',
    accountLabel: 'Google Drive A (Utama)',
    provider: 'google_drive',
    name: 'Invoice_Hosting_Vercel_Sept2026.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 420000,
    parentId: null, // intentionally at root to demonstrate rule auto-organization!
    isFolder: false,
    previewUrl: 'https://docs.google.com/viewer?url=invoice.pdf',
    modifiedAt: '2026-09-09T08:00:00Z',
    extension: 'pdf',
    contentData: 'Invoice Sept 2026: Total $0.00 Hobby Plan.',
  },

  // --- Google Drive B (Media & Foto) ---
  {
    id: 'gdb_fld_1',
    providerFileId: 'gdb_fld_1',
    accountId: 'a0000000-0000-0000-0000-000000000002',
    accountLabel: 'Google Drive B (Media)',
    provider: 'google_drive',
    name: 'Foto Dokumentasi PKL',
    mimeType: 'application/vnd.google-apps.folder',
    sizeBytes: 0,
    parentId: null,
    isFolder: true,
    modifiedAt: '2026-09-03T16:00:00Z',
  },
  {
    id: 'gdb_fld_2',
    providerFileId: 'gdb_fld_2',
    accountId: 'a0000000-0000-0000-0000-000000000002',
    accountLabel: 'Google Drive B (Media)',
    provider: 'google_drive',
    name: 'Asset Banner & Logo',
    mimeType: 'application/vnd.google-apps.folder',
    sizeBytes: 0,
    parentId: null,
    isFolder: true,
    modifiedAt: '2026-09-04T12:00:00Z',
  },
  {
    id: 'gdb_fil_1',
    providerFileId: 'gdb_fil_1',
    accountId: 'a0000000-0000-0000-0000-000000000002',
    accountLabel: 'Google Drive B (Media)',
    provider: 'google_drive',
    name: 'foto_presentasi_kantor.png',
    mimeType: 'image/png',
    sizeBytes: 4280000,
    parentId: 'gdb_fld_1',
    isFolder: false,
    previewUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800',
    modifiedAt: '2026-09-05T17:40:00Z',
    extension: 'png',
  },
  {
    id: 'gdb_fil_2',
    providerFileId: 'gdb_fil_2',
    accountId: 'a0000000-0000-0000-0000-000000000002',
    accountLabel: 'Google Drive B (Media)',
    provider: 'google_drive',
    name: 'logo_multi_cloud_storage.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: 85000,
    parentId: 'gdb_fld_2',
    isFolder: false,
    previewUrl: 'https://cdn-icons-png.flaticon.com/512/3208/3208726.png',
    modifiedAt: '2026-09-06T11:20:00Z',
    extension: 'svg',
  },
  {
    id: 'gdb_fil_3',
    providerFileId: 'gdb_fil_3',
    accountId: 'a0000000-0000-0000-0000-000000000002',
    accountLabel: 'Google Drive B (Media)',
    provider: 'google_drive',
    name: 'screenshot_error_debug.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1540000,
    parentId: null, // at root
    isFolder: false,
    previewUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
    modifiedAt: '2026-09-09T13:00:00Z',
    extension: 'jpg',
  },

  // --- Google Drive C (Arsip & Backup) ---
  {
    id: 'gdc_fld_1',
    providerFileId: 'gdc_fld_1',
    accountId: 'a0000000-0000-0000-0000-000000000003',
    accountLabel: 'Google Drive C (Arsip)',
    provider: 'google_drive',
    name: 'Database Backups 2026',
    mimeType: 'application/vnd.google-apps.folder',
    sizeBytes: 0,
    parentId: null,
    isFolder: true,
    modifiedAt: '2026-08-30T02:00:00Z',
  },
  {
    id: 'gdc_fil_1',
    providerFileId: 'gdc_fil_1',
    accountId: 'a0000000-0000-0000-0000-000000000003',
    accountLabel: 'Google Drive C (Arsip)',
    provider: 'google_drive',
    name: 'supabase_db_backup_2026_09_01.sql.gz',
    mimeType: 'application/gzip',
    sizeBytes: 48900000,
    parentId: 'gdc_fld_1',
    isFolder: false,
    modifiedAt: '2026-09-01T03:00:00Z',
    extension: 'gz',
  },
  {
    id: 'gdc_fil_2',
    providerFileId: 'gdc_fil_2',
    accountId: 'a0000000-0000-0000-0000-000000000003',
    accountLabel: 'Google Drive C (Arsip)',
    provider: 'google_drive',
    name: 'source_code_archive_v1.zip',
    mimeType: 'application/zip',
    sizeBytes: 154000000,
    parentId: null,
    isFolder: false,
    modifiedAt: '2026-09-05T08:10:00Z',
    extension: 'zip',
  },

  // --- OneDrive D (Pribadi & Dokumen) ---
  {
    id: 'odd_fld_1',
    providerFileId: 'odd_fld_1',
    accountId: 'a0000000-0000-0000-0000-000000000004',
    accountLabel: 'OneDrive D (Pribadi)',
    provider: 'onedrive',
    name: 'Dokumen Penting & Sertifikat',
    mimeType: 'folder',
    sizeBytes: 0,
    parentId: null,
    isFolder: true,
    modifiedAt: '2026-08-25T14:00:00Z',
  },
  {
    id: 'odd_fld_2',
    providerFileId: 'odd_fld_2',
    accountId: 'a0000000-0000-0000-0000-000000000004',
    accountLabel: 'OneDrive D (Pribadi)',
    provider: 'onedrive',
    name: 'Spreadsheet Finansial',
    mimeType: 'folder',
    sizeBytes: 0,
    parentId: null,
    isFolder: true,
    modifiedAt: '2026-08-28T09:00:00Z',
  },
  {
    id: 'odd_fil_1',
    providerFileId: 'odd_fil_1',
    accountId: 'a0000000-0000-0000-0000-000000000004',
    accountLabel: 'OneDrive D (Pribadi)',
    provider: 'onedrive',
    name: 'Sertifikat_Kompetensi_Cloud_2026.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2100000,
    parentId: 'odd_fld_1',
    isFolder: false,
    previewUrl: 'https://onedrive.live.com/view?cid=sample_cert',
    modifiedAt: '2026-09-02T15:20:00Z',
    extension: 'pdf',
    contentData: 'Sertifikat Kompetensi Cloud Architecture.',
  },
  {
    id: 'odd_fil_2',
    providerFileId: 'odd_fil_2',
    accountId: 'a0000000-0000-0000-0000-000000000004',
    accountLabel: 'OneDrive D (Pribadi)',
    provider: 'onedrive',
    name: 'Budget_Rencana_Tahunan_2026.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 890000,
    parentId: 'odd_fld_2',
    isFolder: false,
    previewUrl: 'https://onedrive.live.com/view?cid=sample_budget',
    modifiedAt: '2026-09-06T18:00:00Z',
    extension: 'xlsx',
  },
  {
    id: 'odd_fil_3',
    providerFileId: 'odd_fil_3',
    accountId: 'a0000000-0000-0000-0000-000000000004',
    accountLabel: 'OneDrive D (Pribadi)',
    provider: 'onedrive',
    name: 'Catatan_Ide_Startup.txt',
    mimeType: 'text/plain',
    sizeBytes: 14200,
    parentId: null,
    isFolder: false,
    modifiedAt: '2026-09-08T20:30:00Z',
    extension: 'txt',
    contentData: 'Ide aplikasi Multi-Cloud Storage Hub terpadu untuk efisiensi penyimpanan.',
  },
];

// Global persistent storage store for the server session
declare global {
  var __mockStoreFiles: MockFileRecord[] | undefined;
}

function getStore(): MockFileRecord[] {
  if (!global.__mockStoreFiles) {
    global.__mockStoreFiles = [...MOCK_FILES];
  }
  return global.__mockStoreFiles;
}

export class MockStorageAdapter implements StorageAdapter {
  provider: StorageProvider;
  accountId: string;
  accountLabel: string;

  constructor(accountId: string, provider: StorageProvider, accountLabel: string) {
    this.accountId = accountId;
    this.provider = provider;
    this.accountLabel = accountLabel;
  }

  async listFiles(folderId: string | null = null): Promise<UnifiedFile[]> {
    const store = getStore();
    return store.filter((f) => {
      if (f.accountId !== this.accountId) return false;
      if (folderId === null || folderId === '' || folderId === 'root') {
        return f.parentId === null;
      }
      return f.parentId === folderId;
    });
  }

  async getFile(fileId: string): Promise<UnifiedFile | null> {
    const store = getStore();
    const file = store.find((f) => f.id === fileId || f.providerFileId === fileId);
    return file || null;
  }

  async createFolder(name: string, parentId: string | null = null): Promise<UnifiedFile> {
    const store = getStore();
    const newId = `${this.provider === 'google_drive' ? 'gd' : 'od'}_fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newFolder: MockFileRecord = {
      id: newId,
      providerFileId: newId,
      accountId: this.accountId,
      accountLabel: this.accountLabel,
      provider: this.provider,
      name,
      mimeType: this.provider === 'google_drive' ? 'application/vnd.google-apps.folder' : 'folder',
      sizeBytes: 0,
      parentId: parentId && parentId !== 'root' ? parentId : null,
      isFolder: true,
      modifiedAt: new Date().toISOString(),
    };
    store.push(newFolder);
    return newFolder;
  }

  async uploadFile(options: UploadOptions): Promise<UnifiedFile> {
    const store = getStore();
    const ext = options.name.split('.').pop() || '';
    const newId = `${this.provider === 'google_drive' ? 'gd' : 'od'}_fil_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    let contentString = '';
    if (typeof options.content === 'string') {
      contentString = options.content;
    } else if (Buffer.isBuffer(options.content)) {
      contentString = options.content.toString('utf-8');
    }

    const newFile: MockFileRecord = {
      id: newId,
      providerFileId: newId,
      accountId: this.accountId,
      accountLabel: this.accountLabel,
      provider: this.provider,
      name: options.name,
      mimeType: options.mimeType || 'application/octet-stream',
      sizeBytes: options.sizeBytes || (contentString ? contentString.length : 1024),
      parentId: options.parentId && options.parentId !== 'root' ? options.parentId : null,
      isFolder: false,
      modifiedAt: new Date().toISOString(),
      extension: ext,
      contentData: contentString,
      previewUrl: options.mimeType.startsWith('image/') ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' : undefined,
    };
    store.push(newFile);
    return newFile;
  }

  async updateContent(fileId: string, content: ReadableStream<Uint8Array> | Buffer | string): Promise<void> {
    const store = getStore();
    const file = store.find((f) => f.id === fileId || f.providerFileId === fileId);
    if (!file) throw new Error('File not found');

    if (typeof content === 'string') {
      file.contentData = content;
      file.sizeBytes = Buffer.byteLength(content);
    } else if (Buffer.isBuffer(content)) {
      file.contentData = content.toString('utf-8');
      file.sizeBytes = content.length;
    }
    file.modifiedAt = new Date().toISOString();
  }

  async rename(fileId: string, newName: string): Promise<UnifiedFile> {
    const store = getStore();
    const file = store.find((f) => f.id === fileId || f.providerFileId === fileId);
    if (!file) throw new Error('File not found');

    file.name = newName;
    file.extension = newName.split('.').pop() || '';
    file.modifiedAt = new Date().toISOString();
    return file;
  }

  async deleteFile(fileId: string): Promise<void> {
    const store = getStore();
    const index = store.findIndex((f) => f.id === fileId || f.providerFileId === fileId);
    if (index !== -1) {
      store.splice(index, 1);
    }
  }

  async downloadStream(fileId: string): Promise<Buffer> {
    const store = getStore();
    const file = store.find((f) => f.id === fileId || f.providerFileId === fileId);
    if (!file) throw new Error('File not found');

    const content = file.contentData || `Mock binary file stream for: ${file.name}`;
    return Buffer.from(content, 'utf-8');
  }

  async getStorageQuota(): Promise<StorageQuota> {
    const store = getStore();
    const accountFiles = store.filter((f) => f.accountId === this.accountId);
    const usedBytes = accountFiles.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
    // 15GB for Google Drive, 100GB for OneDrive
    const limitBytes = this.provider === 'google_drive' ? 16106127360 : 107374182400;
    const usedPercentage = Math.min(100, Math.round((usedBytes / limitBytes) * 100));

    return {
      usedBytes,
      limitBytes,
      usedPercentage,
    };
  }

  async searchFiles(query: string, folderId: string | null = null): Promise<UnifiedFile[]> {
    const store = getStore();
    const lowerQ = query.toLowerCase();
    return store.filter((f) => {
      if (f.accountId !== this.accountId) return false;
      if (folderId && f.parentId !== folderId) return false;
      return f.name.toLowerCase().includes(lowerQ);
    });
  }
}
