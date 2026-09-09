import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory, DEFAULT_ACCOUNTS } from '@/lib/storage/factory';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account');

    const cleanId = id.includes(':') ? id.split(':').slice(1).join(':') : id;
    const inline = searchParams.get('inline') === 'true';

    let targetAdapter = accountId ? AdapterFactory.getAdapter(accountId) : null;
    let targetFile = null;

    if (targetAdapter) {
      targetFile = await targetAdapter.getFile(cleanId);
    } else {
      for (const acc of DEFAULT_ACCOUNTS) {
        const adapter = AdapterFactory.getAdapter(acc.id);
        const f = await adapter.getFile(cleanId);
        if (f) {
          targetAdapter = adapter;
          targetFile = f;
          break;
        }
      }
    }

    if (!targetAdapter || !targetFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const dataBuffer = await targetAdapter.downloadStream(cleanId);

    // Resolve accurate Content-Type for preview
    let contentType = targetFile.mimeType || 'application/octet-stream';
    const ext = (targetFile.name.split('.').pop() || targetFile.extension || '').toLowerCase();
    if (!contentType || contentType === 'application/octet-stream') {
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        bmp: 'image/bmp',
        pdf: 'application/pdf',
        mp4: 'video/mp4',
        mp3: 'audio/mpeg',
      };
      if (mimeMap[ext]) contentType = mimeMap[ext];
    }

    const dispositionType = inline ? 'inline' : 'attachment';
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `${dispositionType}; filename="${encodeURIComponent(targetFile.name)}"`,
    };

    if (Buffer.isBuffer(dataBuffer)) {
      headers['Content-Length'] = dataBuffer.length.toString();
    } else if (targetFile.sizeBytes) {
      headers['Content-Length'] = targetFile.sizeBytes.toString();
    }

    return new NextResponse(dataBuffer as any, { headers });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to download file' }, { status: 500 });
  }
}
