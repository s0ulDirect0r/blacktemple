import type { MetadataRoute } from 'next';
import { getGalleryImages } from '@/lib/gallery';
import { getAllPosts } from '@/lib/mdx';
import { SITE_URL } from '@/lib/site';

// Regenerate hourly so new artwork and posts show up without a redeploy.
export const revalidate = 3600;

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/gallery', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/projects', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/writing', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/book', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/resume', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  let postEntries: MetadataRoute.Sitemap = [];
  try {
    postEntries = getAllPosts().map((post) => ({
      url: `${SITE_URL}/writing/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: 'yearly',
      priority: 0.5,
    }));
  } catch (error) {
    console.error('[sitemap] could not read posts:', error);
  }

  let artworkEntries: MetadataRoute.Sitemap = [];
  try {
    // limit: 0 removes the LIMIT clause and returns every artwork.
    const { images } = await getGalleryImages({ limit: 0 });
    artworkEntries = images.map((image) => ({
      url: `${SITE_URL}/artwork/${image.id}`,
      lastModified: new Date(image.metadata.updated_at ?? image.metadata.created_at),
      changeFrequency: 'yearly',
      priority: 0.5,
      images: [image.url],
    }));
  } catch (error) {
    console.error('[sitemap] could not load artworks:', error);
  }

  return [...staticEntries, ...postEntries, ...artworkEntries];
}
