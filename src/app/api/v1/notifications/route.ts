import { NextResponse } from 'next/server';
import { Notifier } from '@/lib/notifications/notifier';

export async function GET() {
  const notifications = Notifier.getNotifications();
  const unreadCount = Notifier.getUnreadCount();
  return NextResponse.json({
    notifications,
    unreadCount,
  });
}

export async function POST() {
  Notifier.markAllAsRead();
  return NextResponse.json({ success: true, message: 'All marked as read' });
}
