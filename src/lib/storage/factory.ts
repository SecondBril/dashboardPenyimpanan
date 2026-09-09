import { StorageAdapter, AccountInfo } from './types';
import { GoogleDriveAdapter } from './google-drive';
import { OneDriveAdapter } from './onedrive';
import { MockStorageAdapter } from './mock-adapter';

// Default Accounts Configuration (3x Google Drive + 1x OneDrive)
export const DEFAULT_ACCOUNTS: AccountInfo[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    provider: 'google_drive',
    label: 'Google Drive A (Utama)',
    email: 'ag4863017@gmail.com',
    storageUsedBytes: 24180424704, // Real: 22.5 GB
    storageLimitBytes: 5497558138880, // 5 TB
    colorCode: '#2563eb', // Blue
    status: 'connected',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    provider: 'google_drive',
    label: 'Google Drive B (Media)',
    email: 'rinpattinson98@gmail.com',
    storageUsedBytes: 10485760, // Real: 0.01 GB
    storageLimitBytes: 5497558138880, // 5 TB
    colorCode: '#059669', // Emerald
    status: 'connected',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    provider: 'google_drive',
    label: 'Google Drive C (Arsip)',
    email: 'jkeluar77@gmail.com',
    storageUsedBytes: 0,
    storageLimitBytes: 5497558138880, // 5 TB
    colorCode: '#d97706', // Amber
    status: 'connected',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    provider: 'onedrive',
    label: 'OneDrive D (Pribadi)',
    email: 'onedrive.personal@live.com',
    storageUsedBytes: 21474836480, // 20 GB
    storageLimitBytes: 107374182400, // 100 GB
    colorCode: '#0284c7', // Sky blue
    status: 'connected',
  },
];

export class AdapterFactory {
  private static adapterCache = new Map<string, StorageAdapter>();

  public static getAdapter(accountId: string): StorageAdapter {
    if (this.adapterCache.has(accountId)) {
      return this.adapterCache.get(accountId)!;
    }

    const account = DEFAULT_ACCOUNTS.find((a) => a.id === accountId);
    if (!account) {
      throw new Error(`Unknown account ID: ${accountId}`);
    }

    const appMode = process.env.NEXT_PUBLIC_APP_MODE || 'mock';

    // If mock mode or missing API credentials, use MockStorageAdapter
    if (appMode === 'mock') {
      const adapter = new MockStorageAdapter(account.id, account.provider, account.label);
      this.adapterCache.set(accountId, adapter);
      return adapter;
    }

    // Production mode with Google Drive API
    if (account.provider === 'google_drive') {
      const specificToken = process.env[`GOOGLE_REFRESH_TOKEN_${account.id}`];
      const fallbackToken = process.env.GOOGLE_REFRESH_TOKEN;
      const refreshToken = (specificToken && !specificToken.startsWith('your-')) 
        ? specificToken 
        : (fallbackToken && !fallbackToken.startsWith('your-') ? fallbackToken : '');

      if (!refreshToken) {
        // Fallback to mock if token not yet provided
        const adapter = new MockStorageAdapter(account.id, account.provider, account.label);
        this.adapterCache.set(accountId, adapter);
        return adapter;
      }
      const adapter = new GoogleDriveAdapter(account.id, account.label, refreshToken);
      this.adapterCache.set(accountId, adapter);
      return adapter;
    }

    // Production mode with Microsoft Graph (OneDrive)
    if (account.provider === 'onedrive') {
      const accessToken = process.env.MICROSOFT_ACCESS_TOKEN || '';
      const refreshToken = process.env.MICROSOFT_REFRESH_TOKEN || '';
      const validAccess = accessToken && !accessToken.startsWith('your-') ? accessToken : undefined;
      const validRefresh = refreshToken && !refreshToken.startsWith('your-') ? refreshToken : undefined;

      if (!validAccess && !validRefresh) {
        const adapter = new MockStorageAdapter(account.id, account.provider, account.label);
        this.adapterCache.set(accountId, adapter);
        return adapter;
      }
      const adapter = new OneDriveAdapter(account.id, account.label, validAccess, validRefresh);
      this.adapterCache.set(accountId, adapter);
      return adapter;
    }

    throw new Error(`Unsupported provider for account ${accountId}`);
  }

  public static getAllAdapters(): { account: AccountInfo; adapter: StorageAdapter }[] {
    return DEFAULT_ACCOUNTS.map((acc) => ({
      account: acc,
      adapter: this.getAdapter(acc.id),
    }));
  }
}
