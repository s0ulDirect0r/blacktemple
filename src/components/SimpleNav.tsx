'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SimpleNav() {
  const pathname = usePathname();

  const links = [
    { href: '/gallery', label: 'Gallery' },
    { href: '/writing', label: 'Writing' },
    { href: '/projects', label: 'Projects' },
    { href: '/book', label: 'Book' },
    { href: '/resume', label: 'Resume' },
  ];

  return (
    <nav className="flex justify-center gap-16 pb-6 text-2xl uppercase font-bold">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`transition-colors hover:text-white ${
            pathname.startsWith(link.href)
              ? 'text-white font-extrabold'
              : 'text-gray-600'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
