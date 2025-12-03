'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiImage, FiEdit3, FiCode, FiBook, FiFileText, FiSettings } from 'react-icons/fi';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Gallery', icon: FiImage },
    { href: 'https://souldirection.substack.com', label: 'Writing', icon: FiEdit3, external: true },
    { href: '/projects', label: 'Projects', icon: FiCode },
    { href: '/book', label: 'Book', icon: FiBook },
    { href: '/resume', label: 'Resume', icon: FiFileText },
    { href: '/admin', label: 'Admin', icon: FiSettings },
  ];

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Site title */}
          <Link href="/" className="text-xl font-bold text-white hover:text-zinc-300 transition-colors">
            The Black Temple
          </Link>

          {/* Navigation links */}
          <div className="flex items-center space-x-1">
            {links.map(({ href, label, icon: Icon, external }) => {
              const isActive = !external && (pathname === href || (href !== '/' && pathname?.startsWith(href)));
              const className = `
                flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
                ${isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }
              `;

              if (external) {
                return (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  className={className}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
