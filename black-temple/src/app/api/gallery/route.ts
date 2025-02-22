import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // This ensures the route is not statically optimized
export const revalidate = 0; // This disables caching for this route

export async function GET() {
  try {
    const { blobs } = await list({
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    });

    const images = blobs.map(blob => ({
      id: blob.url,  // Using URL as ID since we don't have DB records
      url: blob.url,
      created_at: blob.uploadedAt,
    }));

    return NextResponse.json({
      success: true,
      images: images,
    });
  } catch (error) {
    console.error('Gallery fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery' },
      { status: 500 }
    );
  }
} 