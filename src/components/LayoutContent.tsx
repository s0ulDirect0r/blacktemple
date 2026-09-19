"use client";

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import ZoneNavBar from './ZoneNavBar';

// Keep WebGL and the scene's dependencies out of standalone page downloads.
const SceneLayout = dynamic(() => import('./SceneLayout'), { loading: () => <ZoneNavBar placement="inline" /> });

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/portfolio')) return <>{children}</>;
  if (pathname.startsWith('/music') || pathname.startsWith('/spidernomicon')) {
    return <><ZoneNavBar placement="inline" />{children}</>;
  }
  return <SceneLayout>{children}</SceneLayout>;
}
