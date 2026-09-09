import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory, DEFAULT_ACCOUNTS } from '@/lib/storage/factory';
import { SmartClassifier } from '@/lib/organization/smart-classifier';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account') || 'all';
    const folderId = searchParams.get('folder') || null;
    const query = searchParams.get('q') || '';

    if (accountId !== 'all') {
      const adapter = AdapterFactory.getAdapter(accountId);
      const files = query 
        ? await adapter.searchFiles(query, folderId)
        : await adapter.listFiles(folderId);

      return NextResponse.json({ items: files });
    }

    // Query all accounts in parallel
    const allFiles = await Promise.all(
      DEFAULT_ACCOUNTS.map(async (acc) => {
        try {
          const adapter = AdapterFactory.getAdapter(acc.id);
          return query
            ? await adapter.searchFiles(query, folderId)
            : await adapter.listFiles(folderId);
        } catch {
          return [];
        }
      })
    );

    return NextResponse.json({ items: allFiles.flat() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list files' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // If multipart/form-data (File Upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const accountId = (formData.get('accountId') as string) || DEFAULT_ACCOUNTS[0].id;
      const parentId = (formData.get('parentId') as string) || null;
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const adapter = AdapterFactory.getAdapter(accountId);

      const createdFile = await adapter.uploadFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        parentId,
        content: buffer,
      });

      // Run through Smart Auto-Organization (Rule Engine & Gemini AI)
      const classification = await SmartClassifier.processFile(createdFile);

      return NextResponse.json({
        file: createdFile,
        classification,
      }, { status: 201 });
    }

    // Otherwise JSON payload (Create Folder or simple file)
    const body = await req.json();
    const { accountId, parentId, name, isFolder, content, mimeType } = body;

    if (!accountId || !name) {
      return NextResponse.json({ error: 'accountId and name are required' }, { status: 400 });
    }

    const adapter = AdapterFactory.getAdapter(accountId);

    if (isFolder) {
      const folder = await adapter.createFolder(name, parentId);
      return NextResponse.json({ file: folder }, { status: 201 });
    }

    const newFile = await adapter.uploadFile({
      name,
      mimeType: mimeType || 'text/plain',
      parentId,
      content: content || '',
      sizeBytes: content ? Buffer.byteLength(content) : 0,
    });

    const classification = await SmartClassifier.processFile(newFile);

    return NextResponse.json({
      file: newFile,
      classification,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create file/folder' }, { status: 500 });
  }
}
