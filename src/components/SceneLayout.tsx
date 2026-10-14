'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { NavigationProvider } from '@/context/NavigationContext';
import ZoneOverlay from './ZoneOverlay';
import ZoneNavBar from './ZoneNavBar';
import Link from 'next/link';

const ThreeScene = dynamic(() => import('./ThreeScene'), { ssr: false });

export default function SceneLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The writing pages are documents rendered over the scene, not zones, so
  // ZoneOverlay shows no bar for them; render it in flow above the page.
  const showInlineBar =
    pathname.startsWith('/writing') || pathname.startsWith('/artwork') || pathname.startsWith('/admin');

  return (
    <NavigationProvider>
      {/* Persistent 3D scene as background */}
      <ThreeScene />

      {/* Zone content overlays (rendered as regular HTML outside Canvas) */}
      <ZoneOverlay />

      {pathname === '/' && <Link href="/support" className="font-pixel fixed bottom-5 right-5 z-30 rounded border border-white/10 bg-black/50 px-4 py-3 text-[10px] text-zinc-400 transition hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Support the Temple</Link>}

      {/* Page content (for routes that still render content) */}
      <main className="relative z-10 pointer-events-none">
        <div className="pointer-events-auto">
          {showInlineBar && <ZoneNavBar placement="inline" />}
          {children}
        </div>
      </main>
    </NavigationProvider>
  );
}
