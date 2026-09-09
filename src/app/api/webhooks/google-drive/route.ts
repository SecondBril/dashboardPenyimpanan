import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const channelId = req.headers.get('x-goog-channel-id');
  const resourceState = req.headers.get('x-goog-resource-state');
  const resourceUri = req.headers.get('x-goog-resource-uri');

  // Verification handshake from Google
  if (resourceState === 'sync') {
    return NextResponse.json({ status: 'verified', channelId });
  }

  // Handle file change or addition
  if (resourceState === 'change') {
    // In production, sync changes via drive.changes.list
    return NextResponse.json({ status: 'change_received', channelId });
  }

  return NextResponse.json({ status: 'ok' });
}
