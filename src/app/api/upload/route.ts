import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { imageSize } from 'image-size';
import { nanoid } from 'nanoid';
import { ArtworkMetadata } from '@/types/artwork';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function POST(request: Request) {
  try {
    if (!await verifyAdminRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'File is too large' },
        { status: 413 }
      );
    }

    let metadata: ArtworkMetadata;
    try {
      metadata = JSON.parse(String(data.get('metadata'))) as ArtworkMetadata;
    } catch {
      return NextResponse.json(
        { error: 'Invalid metadata' },
        { status: 400 }
      );
    }

    // Read the file once: detect its real type and dimensions and upload the same bytes.
    const bytes = Buffer.from(await file.arrayBuffer());

    let size: ReturnType<typeof imageSize>;
    try {
      size = imageSize(bytes);
    } catch {
      return NextResponse.json(
        { error: 'File is not a supported image' },
        { status: 415 }
      );
    }
    const contentType = size.type ? ALLOWED_TYPES[size.type] : undefined;
    if (!contentType || !size.width || !size.height) {
      return NextResponse.json(
        { error: 'File is not a supported image' },
        { status: 415 }
      );
    }
    const { width, height } = size;

    // Upload to Vercel Blob under a server-chosen name, with the detected type.
    const blob = await put(`art/${nanoid()}.${size.type === 'jpg' ? 'jpg' : size.type}`, bytes, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN!,
      contentType,
    });

    // Store metadata in database
    const result = await sql`
      INSERT INTO artworks (
        url,
        title,
        description,
        project_id,
        tags,
        width,
        height,
        created_at,
        updated_at
      ) VALUES (
        ${blob.url},
        ${metadata.title},
        ${metadata.description || null},
        ${metadata.projectId || null},
        ${metadata.tags || []},
        ${width},
        ${height},
        NOW(),
        NOW()
      )
      RETURNING id;
    `;

    return NextResponse.json({
      id: result[0].id,
      url: blob.url,
      width: width ?? undefined,
      height: height ?? undefined,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
} 