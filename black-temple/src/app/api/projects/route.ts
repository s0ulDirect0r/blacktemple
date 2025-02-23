import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const projects = await sql`
      SELECT * FROM projects 
      ORDER BY created_at DESC;
    `;
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const adminSecret = data.get('ADMIN_SECRET') as string;
    
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const name = data.get('name') as string;
    const description = data.get('description') as string;

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO projects (name, description, created_at)
      VALUES (${name}, ${description}, NOW())
      RETURNING *;
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
} 