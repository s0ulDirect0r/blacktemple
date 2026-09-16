import { PAGE_META, pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({ ...PAGE_META.projects, path: '/projects' });

// Projects page - content rendered by ProjectsZone in 3D scene
// This page renders null as the zone handles display
export default function ProjectsPage() {
  return null;
}
