import { BOOK_DESCRIPTION, BOOK_TITLE, SITE_NAME, pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  title: BOOK_TITLE,
  description: BOOK_DESCRIPTION,
  path: '/book',
  ogTitle: `${BOOK_TITLE} — a novel by ${SITE_NAME}`,
  openGraph: { type: 'book', authors: [SITE_NAME] },
});

// Book page - content rendered by BookZone in 3D scene
// This page renders null as the zone handles display
export default function BookPage() {
  return null;
}
