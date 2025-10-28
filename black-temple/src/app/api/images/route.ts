import { NextResponse } from 'next/server';
import { getGalleryImages } from '@/lib/gallery';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const unassignedParam = searchParams.get('unassigned');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    let limit: number | undefined;
    if (limitParam !== null) {
      const parsed = Number.parseInt(limitParam, 10);
      if (!Number.isNaN(parsed)) {
        limit = parsed;
      }
    }

    let offset: number | undefined;
    if (offsetParam !== null) {
      const parsedOffset = Number.parseInt(offsetParam, 10);
      if (!Number.isNaN(parsedOffset)) {
        offset = parsedOffset;
      }
    }

    const normalizedProjectId = unassignedParam === 'true' ? 'unassigned' : projectId;

    const { images, hasMore } = await getGalleryImages({
      projectId: normalizedProjectId,
      limit,
      offset,
    });

    return NextResponse.json({ images, hasMore });
  } catch (error) {
    console.error('Failed to fetch images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
} 
