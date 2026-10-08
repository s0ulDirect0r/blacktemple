'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useOptionalNavigation } from '@/context/NavigationContext';
import { CALLS_AVAILABLE } from '@/lib/calls/access';
import { ZoneId, ZONES, isZonePath, pathToZoneId } from '@/constants/zones';

// Nav entries in display order. Zones fly the camera; routes are plain pages.
type NavEntry =
  | { kind: 'zone'; id: ZoneId; label: string }
  | { kind: 'route'; id: string; label: string; href: string };

const navLinks: NavEntry[] = [
  { kind: 'zone', id: 'projects', label: 'Code' },
  { kind: 'zone', id: 'gallery', label: 'Art' },
  { kind: 'route', id: 'writing', label: 'Writing', href: '/writing' },
  { kind: 'zone', id: 'book', label: 'Book' },
  { kind: 'zone', id: 'about', label: 'About' },
  { kind: 'route', id: 'calls', label: 'Calls', href: '/calls' },
];

// Standalone pages that sit under a zone in the site's hierarchy: the bar
// highlights that zone while you are there.
const ROUTE_PARENTS: { prefix: string; zone: ZoneId }[] = [{ prefix: '/spidernomicon', zone: 'gallery' }];

interface ZoneNavBarProps {
  /**
   * 'overlay' (default): fixed over the 3D scene, as in the zones.
   * 'inline': in normal flow above a document page (/writing, /music, ...).
   */
  placement?: 'overlay' | 'inline';
}

function activeEntryId(pathname: string, targetZone: ZoneId | undefined): string | null {
  const route = navLinks.find((link) => link.kind === 'route' && pathname.startsWith(link.href));
  if (route) return route.id;

  const parent = ROUTE_PARENTS.find((entry) => pathname.startsWith(entry.prefix));
  if (parent) return parent.zone;

  if (!isZonePath(pathname)) return null;
  return targetZone ?? pathToZoneId(pathname);
}

const linkClassName =
  'font-pixel text-[10px] sm:text-[16px] md:text-2xl pointer-events-auto transition-all duration-200 hover:scale-110 text-center';

function linkStyle(isActive: boolean) {
  return {
    color: isActive ? '#ffffff' : '#bbbbbb',
    textShadow: isActive
      ? '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
      : '0 0 10px rgba(255, 255, 255, 0.3)',
    opacity: isActive ? 1 : 0.85,
  };
}

export default function ZoneNavBar({ placement = 'overlay' }: ZoneNavBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navigation = useOptionalNavigation();

  const activeId = activeEntryId(pathname, navigation?.targetZone);

  const goToZone = (zoneId: ZoneId) => {
    // With the scene mounted and the camera already in a zone, fly there.
    // Otherwise (no scene, or a document route over it) change the route and
    // let the scene pick the zone up from the URL.
    if (navigation && isZonePath(pathname)) {
      navigation.navigateToZone(zoneId);
    } else {
      router.push(ZONES[zoneId].path);
    }
  };

  return (
    <nav
      aria-label="Site"
      className={
        placement === 'inline'
          ? 'relative z-30 border-b border-white/10 bg-black'
          : 'fixed top-0 left-0 right-0 z-30 pointer-events-none'
      }
    >
      {/* Mobile: centered rows that wrap at word width (two rows on a phone), Desktop: one row */}
      <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 py-2 px-2 sm:gap-6 md:gap-10 sm:py-4 sm:px-4">
        {navLinks.filter((link) => CALLS_AVAILABLE || link.id !== 'calls').map((link) => {
          const isActive = activeId === link.id;
          if (link.kind === 'route') {
            return (
              <Link
                key={link.id}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={linkClassName}
                style={linkStyle(isActive)}
              >
                {link.label.toUpperCase()}
              </Link>
            );
          }
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => goToZone(link.id)}
              aria-current={isActive ? 'page' : undefined}
              className={linkClassName}
              style={linkStyle(isActive)}
            >
              {link.label.toUpperCase()}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
