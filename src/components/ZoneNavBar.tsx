'use client';

import { useNavigation } from '@/context/NavigationContext';
import { ZoneId } from '@/constants/zones';

// Nav links in display order
const navLinks: { id: ZoneId | 'home'; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'projects', label: 'Code' },
  { id: 'gallery', label: 'Art' },
  { id: 'book', label: 'Book' },
  { id: 'resume', label: 'Resume' },
  { id: 'about', label: 'About' },
];

export default function ZoneNavBar() {
  const { targetZone, navigateToZone } = useNavigation();

  const handleClick = (zoneId: ZoneId) => {
    navigateToZone(zoneId);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
      {/* Mobile: 2-row grid (3 items per row), Desktop: flex row */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1 py-2 px-2 sm:flex sm:flex-wrap sm:justify-center sm:items-center sm:gap-6 md:gap-10 sm:py-4 sm:px-4">
        {navLinks.map((link, index) => {
          const isActive = targetZone === link.id;
          return (
            <button
              key={link.id}
              onClick={() => handleClick(link.id as ZoneId)}
              className="font-pixel text-[10px] sm:text-[16px] md:text-2xl pointer-events-auto transition-all duration-200 hover:scale-110 text-center"
              style={{
                color: isActive ? '#ffffff' : '#bbbbbb',
                textShadow: isActive
                  ? '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
                  : '0 0 10px rgba(255, 255, 255, 0.3)',
                opacity: isActive ? 1 : 0.85,
              }}
            >
              {link.label.toUpperCase()}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
