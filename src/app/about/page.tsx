import { PAGE_META, pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  ...PAGE_META.about,
  path: '/about',
  openGraph: { type: 'profile', firstName: 'Matthew', lastName: 'Huff' },
});

// About page - content rendered by AboutZone in 3D scene
// This page renders null as the zone handles display
export default function AboutPage() {
  return null;
}
