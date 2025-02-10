import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = 'force-dynamic'; // This ensures the route is not statically optimized
export const revalidate = 0; // This disables caching for this route

export async function GET() {
  try {
    const result = await cloudinary.search
      .expression('folder:art-gallery/*')
      .sort_by('created_at', 'desc')
      .max_results(30)
      .execute();

    return Response.json({
      success: true,
      images: result.resources,
    });
  } catch (error) {
    console.error('Gallery fetch error:', error);
    return Response.json(
      { error: 'Failed to fetch gallery' },
      { status: 500 }
    );
  }
} 