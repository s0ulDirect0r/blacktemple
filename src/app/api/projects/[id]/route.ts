import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET handler to fetch a single project by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the project ID from the URL
    const { id } = await params;
    
    // Fetch the project from the database
    const result = await sql`
      SELECT * FROM projects
      WHERE id = ${id}
    `;
    
    // Handle not found case
    if (result.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Return the project data
    return NextResponse.json({
      id: result[0].id,
      name: result[0].name,
      description: result[0].description,
      created_at: result[0].created_at
    });
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
} 