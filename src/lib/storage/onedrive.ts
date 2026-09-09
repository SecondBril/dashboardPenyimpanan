import { Client } from '@microsoft/microsoft-graph-client';
import { StorageAdapter, StorageProvider, UnifiedFile, StorageQuota, UploadOptions } from './types';

export class OneDriveAdapter implements StorageAdapter {
  provider: StorageProvider = 'onedrive';
  accountId: string;
  accountLabel: string;
  private client: Client;
  private static cachedAccessToken: string | null = null;
  private static tokenExpiresAt: number = 0;
  private providedAccessToken?: string;
  private refreshToken?: string;

  constructor(accountId: string, accountLabel: string, accessToken?: string, refreshToken?: string) {
    this.accountId = accountId;
    this.accountLabel = accountLabel;
    this.providedAccessToken = accessToken;
    this.refreshToken = refreshToken || process.env.MICROSOFT_REFRESH_TOKEN;

    this.client = Client.init({
      authProvider: async (done) => {
        try {
          const token = await this.getValidAccessToken();
          done(null, token);
        } catch (error) {
          done(error as any, null);
        }
      },
    });
  }

  private async getValidAccessToken(): Promise<string> {
    // If a static access token is provided and no refresh token, use it
    if (this.providedAccessToken && !this.refreshToken) {
      return this.providedAccessToken;
    }

    // Check if cached token is still valid (with 5-minute safety buffer)
    const now = Date.now();
    if (OneDriveAdapter.cachedAccessToken && OneDriveAdapter.tokenExpiresAt > now + 300000) {
      return OneDriveAdapter.cachedAccessToken;
    }

    // If we have a refresh token, fetch a new access token
    if (this.refreshToken) {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

      if (!clientId || !clientSecret) {
        if (this.providedAccessToken) return this.providedAccessToken;
        throw new Error('MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET are required to refresh Microsoft token');
      }

      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        scope: 'https://graph.microsoft.com/.default offline_access',
      });

      const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        if (this.providedAccessToken) return this.providedAccessToken;
        throw new Error(`Failed to refresh Microsoft Graph token: ${errText}`);
      }

      const data = await res.json();
      OneDriveAdapter.cachedAccessToken = data.access_token;
      const expiresInSec = Number(data.expires_in) || 3600;
      OneDriveAdapter.tokenExpiresAt = now + expiresInSec * 1000;

      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      return data.access_token;
    }

    if (this.providedAccessToken) {
      return this.providedAccessToken;
    }

    throw new Error('No Microsoft Access Token or Refresh Token available');
  }

  async listFiles(folderId: string | null = null): Promise<UnifiedFile[]> {
    const endpoint = folderId && folderId !== 'root'
      ? `/me/drive/items/${folderId}/children`
      : `/me/drive/root/children`;

    const res = await this.client.api(endpoint)
      .select('id,name,size,file,folder,lastModifiedDateTime,webUrl,@microsoft.graph.downloadUrl,parentReference')
      .get();

    return (res.value || []).map((item: any) => this.mapToFile(item, folderId));
  }

  private extractRawId(id: string): string {
    return id.includes(':') ? id.split(':').slice(1).join(':') : id;
  }

  async getFile(fileId: string): Promise<UnifiedFile | null> {
    try {
      const rawId = this.extractRawId(fileId);
      const res = await this.client.api(`/me/drive/items/${rawId}`)
        .select('id,name,size,file,folder,lastModifiedDateTime,webUrl,@microsoft.graph.downloadUrl,parentReference')
        .get();
      return this.mapToFile(res);
    } catch {
      return null;
    }
  }

  async createFolder(name: string, parentId: string | null = null): Promise<UnifiedFile> {
    const rawParentId = parentId ? this.extractRawId(parentId) : null;
    const endpoint = rawParentId && rawParentId !== 'root'
      ? `/me/drive/items/${rawParentId}/children`
      : `/me/drive/root/children`;

    const folderPayload = {
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    };

    const res = await this.client.api(endpoint).post(folderPayload);
    return this.mapToFile(res);
  }

  async uploadFile(options: UploadOptions): Promise<UnifiedFile> {
    const rawParentId = options.parentId ? this.extractRawId(options.parentId) : null;
    const endpoint = rawParentId && rawParentId !== 'root'
      ? `/me/drive/items/${rawParentId}:/${encodeURIComponent(options.name)}:/content`
      : `/me/drive/root:/${encodeURIComponent(options.name)}:/content`;

    let bodyData: any = options.content;
    if (typeof options.content === 'string') {
      bodyData = Buffer.from(options.content, 'utf-8');
    }

    const res = await this.client.api(endpoint).put(bodyData);
    return this.mapToFile(res);
  }

  async updateContent(fileId: string, content: ReadableStream<Uint8Array> | Buffer | string): Promise<void> {
    const rawId = this.extractRawId(fileId);
    let bodyData: any = content;
    if (typeof content === 'string') {
      bodyData = Buffer.from(content, 'utf-8');
    }
    await this.client.api(`/me/drive/items/${rawId}/content`).put(bodyData);
  }

  async rename(fileId: string, newName: string): Promise<UnifiedFile> {
    const rawId = this.extractRawId(fileId);
    const res = await this.client.api(`/me/drive/items/${rawId}`).patch({
      name: newName,
    });
    return this.mapToFile(res);
  }

  async deleteFile(fileId: string): Promise<void> {
    const rawId = this.extractRawId(fileId);
    await this.client.api(`/me/drive/items/${rawId}`).delete();
  }

  async downloadStream(fileId: string): Promise<Buffer> {
    const rawId = this.extractRawId(fileId);
    const item = await this.client.api(`/me/drive/items/${rawId}`)
      .select('@microsoft.graph.downloadUrl')
      .get();
    
    const downloadUrl = item['@microsoft.graph.downloadUrl'];
    if (!downloadUrl) throw new Error('OneDrive download URL not available');

    const res = await fetch(downloadUrl);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  async getStorageQuota(): Promise<StorageQuota> {
    const drive = await this.client.api('/me/drive').select('quota').get();
    const quota = drive.quota || {};
    const usedBytes = Number(quota.used || 0);
    const limitBytes = Number(quota.total || 107374182400); // 100GB
    const usedPercentage = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;

    return {
      usedBytes,
      limitBytes,
      usedPercentage,
    };
  }

  async searchFiles(query: string, folderId: string | null = null): Promise<UnifiedFile[]> {
    const endpoint = folderId && folderId !== 'root'
      ? `/me/drive/items/${folderId}/search(q='${encodeURIComponent(query)}')`
      : `/me/drive/root/search(q='${encodeURIComponent(query)}')`;

    const res = await this.client.api(endpoint).get();
    return (res.value || []).map((item: any) => this.mapToFile(item));
  }

  private mapToFile(item: any, requestedFolderId: string | null = null): UnifiedFile {
    const isFolder = Boolean(item.folder);
    const ext = item.name?.split('.').pop() || '';
    const isAtRoot = !requestedFolderId || requestedFolderId === 'root' || item.parentReference?.path === '/drive/root:';
    const parentId = isAtRoot ? null : (item.parentReference?.id || null);

    return {
      id: `${this.accountId}:${item.id}`,
      providerFileId: item.id,
      accountId: this.accountId,
      accountLabel: this.accountLabel,
      provider: 'onedrive',
      name: item.name,
      mimeType: isFolder ? 'folder' : (item.file?.mimeType || 'application/octet-stream'),
      sizeBytes: Number(item.size || 0),
      parentId,
      isFolder,
      previewUrl: item.webUrl,
      downloadUrl: item['@microsoft.graph.downloadUrl'],
      modifiedAt: item.lastModifiedDateTime || new Date().toISOString(),
      extension: ext,
    };
  }
}
