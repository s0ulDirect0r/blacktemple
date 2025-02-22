import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const result = projectId 
      ? await sql`
          SELECT * FROM artworks 
          WHERE project_id = ${projectId}
          ORDER BY created_at DESC;
        `
      : await sql`
          SELECT * FROM artworks 
          ORDER BY created_at DESC;
        `;
    
    const images = result.map(row => ({
      id: row.id,
      url: row.url,
      metadata: {
        title: row.title,
        description: row.description,
        projectId: row.project_id,
        tags: row.tags,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    }));

    return NextResponse.json(images);
  } catch (error) {
    console.error('Failed to fetch images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
} 