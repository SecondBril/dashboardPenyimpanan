import { NextRequest, NextResponse } from 'next/server';
import { Notifier } from '@/lib/notifications/notifier';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await Notifier.undoClassificationJob(id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to undo classification' }, { status: 500 });
  }
}
