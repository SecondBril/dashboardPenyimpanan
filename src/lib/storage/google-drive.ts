import { google, drive_v3 } from 'googleapis';
import { StorageAdapter, StorageProvider, UnifiedFile, StorageQuota, UploadOptions } from './types';
import { Readable } from 'stream';

export class GoogleDriveAdapter implements StorageAdapter {
  provider: StorageProvider = 'google_drive';
  accountId: string;
  accountLabel: string;
  private drive: drive_v3.Drive;

  constructor(accountId: string, accountLabel: string, refreshToken: string) {
    this.accountId = accountId;
    this.accountLabel = accountLabel;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
  }

  async listFiles(folderId: string | null = null): Promise<UnifiedFile[]> {
    const rawFolderId = folderId ? this.extractRawId(folderId) : null;
    const parentQuery = rawFolderId && rawFolderId !== 'root' 
      ? `'${rawFolderId}' in parents` 
      : `'root' in parents`;
    const q = `trashed = false and ${parentQuery}`;

    const res = await this.drive.files.list({
      q,
      fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, parents)',
      orderBy: 'folder desc, name asc',
      pageSize: 100,
    });

    return (res.data.files || []).map((f) => this.mapToFile(f, rawFolderId));
  }

  private extractRawId(id: string): string {
    return id.includes(':') ? id.split(':').slice(1).join(':') : id;
  }

  async getFile(fileId: string): Promise<UnifiedFile | null> {
    try {
      const rawId = this.extractRawId(fileId);
      const res = await this.drive.files.get({
        fileId: rawId,
        fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, parents, thumbnailLink',
      });
      return this.mapToFile(res.data);
    } catch {
      return null;
    }
  }

  async createFolder(name: string, parentId: string | null = null): Promise<UnifiedFile> {
    const rawParentId = parentId ? this.extractRawId(parentId) : undefined;
    const fileMetadata: drive_v3.Schema$File = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: rawParentId && rawParentId !== 'root' ? [rawParentId] : undefined,
    };

    const res = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, mimeType, size, modifiedTime, webViewLink, parents',
    });

    return this.mapToFile(res.data);
  }

  async uploadFile(options: UploadOptions): Promise<UnifiedFile> {
    const rawParentId = options.parentId ? this.extractRawId(options.parentId) : undefined;
    const fileMetadata: drive_v3.Schema$File = {
      name: options.name,
      parents: rawParentId && rawParentId !== 'root' ? [rawParentId] : undefined,
    };

    let mediaBody: any;
    if (Buffer.isBuffer(options.content)) {
      mediaBody = Readable.from(options.content);
    } else if (typeof options.content === 'string') {
      mediaBody = Readable.from(Buffer.from(options.content, 'utf-8'));
    } else {
      mediaBody = options.content;
    }

    const res = await this.drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: options.mimeType,
        body: mediaBody,
      },
      fields: 'id, name, mimeType, size, modifiedTime, webViewLink, parents, thumbnailLink',
    });

    return this.mapToFile(res.data);
  }

  async updateContent(fileId: string, content: ReadableStream<Uint8Array> | Buffer | string): Promise<void> {
    const rawId = this.extractRawId(fileId);
    let mediaBody: any;
    if (Buffer.isBuffer(content)) {
      mediaBody = Readable.from(content);
    } else if (typeof content === 'string') {
      mediaBody = Readable.from(Buffer.from(content, 'utf-8'));
    } else {
      mediaBody = content;
    }

    await this.drive.files.update({
      fileId: rawId,
      media: {
        body: mediaBody,
      },
    });
  }

  async rename(fileId: string, newName: string): Promise<UnifiedFile> {
    const rawId = this.extractRawId(fileId);
    const res = await this.drive.files.update({
      fileId: rawId,
      requestBody: { name: newName },
      fields: 'id, name, mimeType, size, modifiedTime, webViewLink, parents',
    });

    return this.mapToFile(res.data);
  }

  async deleteFile(fileId: string): Promise<void> {
    const rawId = this.extractRawId(fileId);
    await this.drive.files.delete({ fileId: rawId });
  }

  async downloadStream(fileId: string): Promise<Buffer> {
    const rawId = this.extractRawId(fileId);
    try {
      const meta = await this.drive.files.get({ fileId: rawId, fields: 'id, name, mimeType' });
      if (meta.data.mimeType === 'application/vnd.google-apps.folder') {
        throw new Error(`Item "${meta.data.name}" adalah folder, bukan file tunggal. Pindahkan folder melalui transfer direktori.`);
      }
    } catch (e: any) {
      if (e.message?.includes('adalah folder')) throw e;
    }

    try {
      const res = await this.drive.files.get(
        { fileId: rawId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      return Buffer.from(res.data as ArrayBuffer);
    } catch (err: any) {
      // If it's a Google Workspace file (Docs/Sheets/Slides), export as PDF or Office doc
      const msg = err?.message || '';
      if (msg.includes('export') || err.status === 403 || err.code === 403) {
        try {
          const meta = await this.drive.files.get({ fileId: rawId, fields: 'mimeType' });
          const mime = meta.data.mimeType || '';
          let exportMime = 'application/pdf';
          if (mime.includes('document')) {
            exportMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          } else if (mime.includes('spreadsheet')) {
            exportMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          } else if (mime.includes('presentation')) {
            exportMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          }
          const exportRes = await this.drive.files.export(
            { fileId: rawId, mimeType: exportMime },
            { responseType: 'arraybuffer' }
          );
          return Buffer.from(exportRes.data as ArrayBuffer);
        } catch {
          throw err;
        }
      }
      throw err;
    }
  }

  async getStorageQuota(): Promise<StorageQuota> {
    const res = await this.drive.about.get({ fields: 'storageQuota' });
    const quota = res.data.storageQuota;
    const usedBytes = Number(quota?.usageInDrive || quota?.usage || 0);
    const limitBytes = Number(quota?.limit || 16106127360);
    const usedPercentage = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;

    return {
      usedBytes,
      limitBytes,
      usedPercentage,
    };
  }

  async searchFiles(query: string, folderId: string | null = null): Promise<UnifiedFile[]> {
    const escaped = query.replace(/'/g, "\\'");
    let q = `trashed = false and name contains '${escaped}'`;
    if (folderId && folderId !== 'root') {
      q += ` and '${folderId}' in parents`;
    }

    const res = await this.drive.files.list({
      q,
      fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, parents)',
      pageSize: 50,
    });

    return (res.data.files || []).map((f) => this.mapToFile(f));
  }

  private mapToFile(f: drive_v3.Schema$File, requestedFolderId: string | null = null): UnifiedFile {
    const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
    const ext = f.name?.split('.').pop() || '';
    const isAtRoot = !requestedFolderId || requestedFolderId === 'root';
    const parentId = isAtRoot ? null : (f.parents && f.parents.length > 0 ? f.parents[0] : null);

    return {
      id: `${this.accountId}:${f.id}`,
      providerFileId: f.id || '',
      accountId: this.accountId,
      accountLabel: this.accountLabel,
      provider: 'google_drive',
      name: f.name || 'Untitled',
      mimeType: f.mimeType || 'application/octet-stream',
      sizeBytes: Number(f.size || 0),
      parentId,
      isFolder,
      previewUrl: f.webViewLink || undefined,
      downloadUrl: f.webContentLink || undefined,
      modifiedAt: f.modifiedTime || new Date().toISOString(),
      extension: ext,
    };
  }
}
