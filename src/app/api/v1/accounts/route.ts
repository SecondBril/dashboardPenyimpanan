import { NextResponse } from 'next/server';
import { AdapterFactory, DEFAULT_ACCOUNTS } from '@/lib/storage/factory';
import { fetchAccountsFromDb, syncAccountQuotaToDb } from '@/lib/supabase';

export async function GET() {
  const appMode = process.env.NEXT_PUBLIC_APP_MODE || 'mock';
  
  // Load accounts from Supabase (or fallback to DEFAULT_ACCOUNTS)
  const baseAccounts = await fetchAccountsFromDb(DEFAULT_ACCOUNTS);

  if (appMode === 'mock') {
    return NextResponse.json({ accounts: baseAccounts });
  }

  const accounts = await Promise.all(
    baseAccounts.map(async (acc) => {
      try {
        const adapter = AdapterFactory.getAdapter(acc.id, acc);
        const quota = await adapter.getStorageQuota();
        
        // Sync real storage quota back to Supabase in background
        syncAccountQuotaToDb(acc.id, quota.usedBytes, quota.limitBytes).catch(() => {});

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
