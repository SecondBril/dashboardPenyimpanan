import { NextRequest, NextResponse } from 'next/server';
import { RuleEngine } from '@/lib/organization/rule-engine';

export async function GET() {
  const rules = RuleEngine.getRules();
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, conditionType, conditionValue, targetAccountId, targetFolderId, targetFolderName, sourceFolderFilter } = body;

    if (!name || !conditionType || !conditionValue || !targetAccountId || !targetFolderId) {
      return NextResponse.json({ error: 'Missing required rule parameters' }, { status: 400 });
    }

    const newRule = RuleEngine.addRule({
      name,
      conditionType,
      conditionValue,
      targetAccountId,
      targetFolderId,
      targetFolderName: targetFolderName || 'Target Folder',
      sourceFolderFilter,
      enabled: true,
    });

    return NextResponse.json({ rule: newRule }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create rule' }, { status: 500 });
  }
}
