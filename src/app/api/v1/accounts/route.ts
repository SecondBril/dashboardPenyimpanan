import { NextResponse } from 'next/server';
import { AdapterFactory, DEFAULT_ACCOUNTS } from '@/lib/storage/factory';

export async function GET() {
  const appMode = process.env.NEXT_PUBLIC_APP_MODE || 'mock';
  if (appMode === 'mock') {
    return NextResponse.json({ accounts: DEFAULT_ACCOUNTS });
  }

  const accounts = await Promise.all(
    DEFAULT_ACCOUNTS.map(async (acc) => {
      try {
        const adapter = AdapterFactory.getAdapter(acc.id);
        const quota = await adapter.getStorageQuota();
        return {
          ...acc,
          storageUsedBytes: quota.usedBytes,
          storageLimitBytes: quota.limitBytes,
          status: 'connected' as const,
        };
      } catch {
        return {
          ...acc,
          status: 'needs_reauth' as const,
        };
      }
    })
  );

  return NextResponse.json({ accounts });
}
