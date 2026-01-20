import { NextResponse } from 'next/server';
import { getAllProjects } from '@/lib/mdx';

export async function GET() {
  try {
    const projects = getAllProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch MDX projects:', error);
    return NextResponse.json([], { status: 500 });
  }
}
