import { NextRequest, NextResponse } from 'next/server';
import { TransferEngine } from '@/lib/transfer/transfer-engine';

export async function GET() {
  const jobs = TransferEngine.getAllJobs();
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceAccountId, destAccountId, sourceFileId, destParentId, operation } = body;

    if (!sourceAccountId || !destAccountId || !sourceFileId) {
      return NextResponse.json(
        { error: 'sourceAccountId, destAccountId, and sourceFileId are required' },
        { status: 400 }
      );
    }

    const job = await TransferEngine.createTransferJob({
      sourceAccountId,
      destAccountId,
      sourceFileId,
      destParentId: destParentId || null,
      operation: operation === 'move' ? 'move' : 'copy',
    });

    return NextResponse.json({ job }, { status: 202 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Transfer failed to start' }, { status: 500 });
  }
}
