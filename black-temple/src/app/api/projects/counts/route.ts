import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    // Get counts for all projects
    const projectCounts = await sql`
      SELECT 
        p.id, 
        p.name, 
        COUNT(a.id) as image_count
      FROM 
        projects p
      LEFT JOIN 
        artworks a ON p.id::text = a.project_id
      GROUP BY 
        p.id, p.name
      ORDER BY 
        p.name;
    `;
    
    // Get count of unassigned images
    const unassignedCount = await sql`
      SELECT COUNT(*) as count
      FROM artworks
      WHERE project_id IS NULL;
    `;
    
    // Get total count
    const totalCount = await sql`
      SELECT COUNT(*) as count
      FROM artworks;
    `;
    
    return NextResponse.json({
      projects: projectCounts.map(p => ({
        id: p.id,
        name: p.name,
        count: parseInt(p.image_count)
      })),
      unassigned: parseInt(unassignedCount[0].count),
      total: parseInt(totalCount[0].count)
    });
  } catch (error) {
    console.error('Failed to fetch project counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project counts' },
      { status: 500 }
    );
  }
} 