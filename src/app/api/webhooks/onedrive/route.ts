import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const validationToken = searchParams.get('validationToken');

  // Microsoft Graph subscription validation handshake
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  try {
    const body = await req.json();
    // In production, process notifications in body.value
    return NextResponse.json({ status: 'received', count: body.value?.length || 0 });
  } catch {
    return NextResponse.json({ status: 'ok' });
  }
}
