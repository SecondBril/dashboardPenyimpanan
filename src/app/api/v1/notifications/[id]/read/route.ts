import { NextRequest, NextResponse } from 'next/server';
import { Notifier } from '@/lib/notifications/notifier';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const success = Notifier.markAsRead(id);

  if (!success) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
