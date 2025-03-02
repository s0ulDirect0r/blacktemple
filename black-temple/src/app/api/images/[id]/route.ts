import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { sql } from '@/lib/db';
import { ArtworkMetadata } from '@/types/artwork';

async function verifyAuth(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split(' ')[1];
  const secret = new TextEncoder().encode(process.env.ADMIN_SECRET);
  
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!await verifyAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { metadata } = await request.json() as { metadata: ArtworkMetadata };
    const { id } = params;

    // Update the artwork metadata in the database
    const result = await sql`
      UPDATE artworks
      SET
        title = ${metadata.title},
        description = ${metadata.description || null},
        project_id = ${metadata.projectId || null},
        tags = ${metadata.tags || []},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Return the updated image data
    return NextResponse.json({
      id: result[0].id,
      url: result[0].url,
      metadata: {
        title: result[0].title,
        description: result[0].description,
        projectId: result[0].project_id,
        tags: result[0].tags,
        created_at: result[0].created_at,
        updated_at: result[0].updated_at,
      }
    });
  } catch (error) {
    console.error('Failed to update image:', error);
    return NextResponse.json(
      { error: 'Failed to update image' },
      { status: 500 }
    );
  }
} 