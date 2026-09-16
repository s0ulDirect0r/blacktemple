import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { sql } from '@/lib/db';
import { getArtworkById, mapRowToArtwork, ArtworkRow } from '@/lib/gallery';
import { ArtworkMetadata } from '@/types/artwork';

// Simple auth verification
async function verifyAuth(request: NextRequest) {
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

// GET handler to fetch a single image by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the image ID from the URL
    const { id } = await params;
    
    // Fetch the image from the database
    const image = await getArtworkById(id);

    // Handle not found case
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json(image);
  } catch (error) {
    console.error('Failed to fetch image:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}

// PATCH handler with Promise-based params for Next.js 15
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Check authentication
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Get the image ID from the URL (using await for Promise-based params)
    const { id } = await params;
    
    // 3. Parse the request body
    const body = await request.json();
    const metadata = body.metadata as ArtworkMetadata;
    
    if (!metadata || !metadata.title) {
      return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 });
    }
    
    // 4. Update the database
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
    
    // 5. Handle not found case
    if (result.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // 6. Return the updated image
    return NextResponse.json(mapRowToArtwork(result[0] as ArtworkRow));
  } catch (error) {
    console.error('Failed to update image:', error);
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
} 