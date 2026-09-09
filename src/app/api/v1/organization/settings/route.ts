import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings, updateSystemSettings } from '@/lib/organization/smart-classifier';

export async function GET() {
  return NextResponse.json({ settings: getSystemSettings() });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = updateSystemSettings(body);
    return NextResponse.json({ settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update settings' }, { status: 500 });
  }
}
