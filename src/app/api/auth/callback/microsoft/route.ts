import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${appUrl}/?auth_error=${encodeURIComponent(error)}`);
  }

  return NextResponse.redirect(`${appUrl}/?auth_success=microsoft`);
}
