import { NextResponse } from 'next/server';
import { getGalleryImages } from '@/lib/gallery';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const unassignedParam = searchParams.get('unassigned');
    const limitParam = searchParams.get('limit');

    let limit: number | undefined;
    if (limitParam !== null) {
      const parsed = Number.parseInt(limitParam, 10);
      if (!Number.isNaN(parsed)) {
        limit = parsed;
      }
    }
    const normalizedProjectId = unassignedParam === 'true' ? 'unassigned' : projectId;

    const images = await getGalleryImages({
      projectId: normalizedProjectId,
      limit,
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Failed to fetch images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
} 
