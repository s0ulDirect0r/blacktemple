import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { sql } from '@/lib/db';
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
    const result = await sql`
      SELECT * FROM artworks
      WHERE id = ${id}
    `;
    
    // Handle not found case
    if (result.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Return the image data
    const image = result[0];
    return NextResponse.json({
      id: image.id,
      url: image.url,
      metadata: {
        title: image.title,
        description: image.description,
        projectId: image.project_id,
        tags: image.tags,
        created_at: image.created_at,
        updated_at: image.updated_at
      }
    });
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
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
} 