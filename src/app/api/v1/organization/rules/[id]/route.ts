import { NextRequest, NextResponse } from 'next/server';
import { RuleEngine } from '@/lib/organization/rule-engine';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = RuleEngine.updateRule(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ rule: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update rule' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = RuleEngine.deleteRule(id);
    if (!success) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Rule deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete rule' }, { status: 500 });
  }
}
