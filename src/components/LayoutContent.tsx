'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import SimpleNav from './SimpleNav';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  // On home page, render only the 3D scene (no header/nav)
  if (isHome) {
    return <main>{children}</main>;
  }

  return (
    <>
      <header className="text-center pt-6 pb-2">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <Image
            src="https://zp7hauqhmxup1nll.public.blob.vercel-storage.com/Untitled_Artwork%20115.png"
            alt="The Black Temple"
            width={450}
            height={110}
            className="mx-auto"
            priority
          />
        </Link>
      </header>
      <SimpleNav />
      <main>{children}</main>
    </>
  );
}
