import { NextResponse } from 'next/server';
import { AdapterFactory, DEFAULT_ACCOUNTS } from '@/lib/storage/factory';

export async function GET() {
  try {
    let totalUsed = 0;
    let totalLimit = 0;

    const accountSummaries = await Promise.all(
      DEFAULT_ACCOUNTS.map(async (acc) => {
        try {
          const adapter = AdapterFactory.getAdapter(acc.id);
          const quota = await adapter.getStorageQuota();
          totalUsed += quota.usedBytes;
          totalLimit += quota.limitBytes;

          return {
            account: acc,
            quota,
          };
        } catch (err: any) {
          return {
            account: acc,
            quota: {
              usedBytes: acc.storageUsedBytes,
              limitBytes: acc.storageLimitBytes,
              usedPercentage: Math.round((acc.storageUsedBytes / acc.storageLimitBytes) * 100),
            },
            error: err?.message,
          };
        }
      })
    );

    const totalPercentage = totalLimit > 0 ? Math.min(100, Math.round((totalUsed / totalLimit) * 100)) : 0;

    return NextResponse.json({
      summary: {
        totalUsedBytes: totalUsed,
        totalLimitBytes: totalLimit,
        totalPercentage,
        accounts: accountSummaries,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to get storage summary' }, { status: 500 });
  }
}
