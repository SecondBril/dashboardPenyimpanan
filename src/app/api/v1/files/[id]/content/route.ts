import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory, DEFAULT_ACCOUNTS } from '@/lib/storage/factory';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.text();
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account');

    let targetAdapter = accountId ? AdapterFactory.getAdapter(accountId) : null;
    if (!targetAdapter) {
      for (const acc of DEFAULT_ACCOUNTS) {
        const adapter = AdapterFactory.getAdapter(acc.id);
        const file = await adapter.getFile(id);
        if (file) {
          targetAdapter = adapter;
          break;
        }
      }
    }

    if (!targetAdapter) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await targetAdapter.updateContent(id, body);
    return NextResponse.json({ success: true, message: 'File content updated' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update content' }, { status: 500 });
  }
}
