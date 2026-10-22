"use client";

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import ZoneNavBar from './ZoneNavBar';

// Keep WebGL and the scene's dependencies out of standalone page downloads.
const SceneLayout = dynamic(() => import('./SceneLayout'), { loading: () => <ZoneNavBar placement="inline" /> });

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The portfolio and the admin tools render on their own, without the scene or the site nav.
  if (pathname.startsWith('/portfolio') || pathname.startsWith('/admin')) return <>{children}</>;
  const standalone = ['/music', '/spidernomicon', '/calls', '/privacy', '/support', '/membership', '/members', '/login'];
  if (standalone.some((prefix) => pathname.startsWith(prefix))) {
    return <><ZoneNavBar placement="inline" />{children}</>;
  }
  return <SceneLayout>{children}</SceneLayout>;
}
