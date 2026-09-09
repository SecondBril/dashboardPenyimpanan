import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory, DEFAULT_ACCOUNTS } from '@/lib/storage/factory';
import { SmartClassifier } from '@/lib/organization/smart-classifier';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileId, accountId } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    let targetFile = null;
    if (accountId) {
      const adapter = AdapterFactory.getAdapter(accountId);
      targetFile = await adapter.getFile(fileId);
    } else {
      for (const acc of DEFAULT_ACCOUNTS) {
        const adapter = AdapterFactory.getAdapter(acc.id);
        const f = await adapter.getFile(fileId);
        if (f) {
          targetFile = f;
          break;
        }
      }
    }

    if (!targetFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const job = await SmartClassifier.processFile(targetFile);

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to classify file' }, { status: 500 });
  }
}
