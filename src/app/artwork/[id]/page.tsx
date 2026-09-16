import type { Metadata } from 'next';
import { getArtworkById } from '@/lib/gallery';
import { SITE_NAME, pageMetadata } from '@/lib/site';
import ArtworkPageClient from './ArtworkPageClient';

// Artwork rows rarely change; refresh the cached metadata hourly so edits made
// in /admin show up in link previews without a redeploy.
export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

function summarize(text: string, max = 200): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  const cut = oneLine.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 120))}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  let artwork = null;
  try {
    artwork = await getArtworkById(id);
  } catch (error) {
    console.error(`[metadata] could not load artwork ${id}:`, error);
  }

  if (!artwork) {
    return pageMetadata({
      title: 'Artwork',
      description: `Digital artwork by ${SITE_NAME}.`,
      path: `/artwork/${id}`,
      robots: { index: false, follow: true },
    });
  }

  const title = artwork.metadata.title;

  return pageMetadata({
    title,
    description: artwork.metadata.description?.trim()
      ? summarize(artwork.metadata.description)
      : `${title} — digital artwork by ${SITE_NAME}.`,
    path: `/artwork/${artwork.id}`,
    // The artwork itself is the preview image (its Vercel Blob URL).
    images: [{ url: artwork.url, alt: title }],
    openGraph: { type: 'article' },
  });
}

export default async function ArtworkPage({ params }: Props) {
  const { id } = await params;
  return <ArtworkPageClient id={id} />;
}
