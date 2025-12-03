'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SimpleNav() {
  const pathname = usePathname();

  const links = [
    { href: '/gallery', label: 'Gallery' },
    { href: 'https://souldirection.substack.com', label: 'Writing', external: true },
    { href: '/projects', label: 'Projects' },
    { href: '/book', label: 'Book' },
    { href: '/resume', label: 'Resume' },
  ];

  return (
    <nav className="flex justify-center gap-16 pb-6 text-2xl uppercase font-bold">
      {links.map((link) => {
        const className = `transition-colors hover:text-white ${
          !link.external && pathname.startsWith(link.href)
            ? 'text-white font-extrabold'
            : 'text-gray-600'
        }`;

        if (link.external) {
          return (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {link.label}
            </a>
          );
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            className={className}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
