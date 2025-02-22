import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql } from '@/lib/db';
import { ArtworkMetadata } from '@/types/artwork';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get('file') as File;
    const adminSecret = data.get('ADMIN_SECRET') as string;
    const metadata = JSON.parse(data.get('metadata') as string) as ArtworkMetadata;

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      console.log('Upload auth failed - secrets don\'t match');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    });

    // Store metadata in database
    const result = await sql`
      INSERT INTO artworks (
        url,
        title,
        description,
        project_id,
        tags,
        created_at,
        updated_at
      ) VALUES (
        ${blob.url},
        ${metadata.title},
        ${metadata.description || null},
        ${metadata.projectId || null},
        ${metadata.tags || []},
        ${metadata.created_at},
        ${metadata.updated_at}
      )
      RETURNING id;
    `;

    return NextResponse.json({
      id: result[0].id,
      url: blob.url
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
} 