import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory, DEFAULT_ACCOUNTS } from '@/lib/storage/factory';

async function findAdapterAndFile(fileId: string, accountIdHint?: string | null) {
  if (accountIdHint) {
    const adapter = AdapterFactory.getAdapter(accountIdHint);
    const file = await adapter.getFile(fileId);
    if (file) return { adapter, file };
  }

  // Scan accounts to find file
  for (const acc of DEFAULT_ACCOUNTS) {
    const adapter = AdapterFactory.getAdapter(acc.id);
    const file = await adapter.getFile(fileId);
    if (file) return { adapter, file };
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account');

    const result = await findAdapterAndFile(id, accountId);
    if (!result) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ file: result.file });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error fetching file' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, accountId } = body;

    if (!name) {
      return NextResponse.json({ error: 'New name is required' }, { status: 400 });
    }

    const result = await findAdapterAndFile(id, accountId);
    if (!result) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const updated = await result.adapter.rename(id, name);
    return NextResponse.json({ file: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to rename file' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account');

    const result = await findAdapterAndFile(id, accountId);
    if (!result) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await result.adapter.deleteFile(id);
    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete file' }, { status: 500 });
  }
}
