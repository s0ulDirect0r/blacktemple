import { PAGE_META, pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  ...PAGE_META.resume,
  path: '/resume',
  openGraph: { type: 'profile', firstName: 'Matthew', lastName: 'Huff' },
});

// Resume page - content rendered by ResumeZone in 3D scene
// This page renders null as the zone handles display
export default function ResumePage() {
  return null;
}
