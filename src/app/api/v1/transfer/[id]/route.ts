import { NextRequest, NextResponse } from 'next/server';
import { TransferEngine } from '@/lib/transfer/transfer-engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = TransferEngine.getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Transfer job not found' }, { status: 404 });
  }

  return NextResponse.json({ job });
}
