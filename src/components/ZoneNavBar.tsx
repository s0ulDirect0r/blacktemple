'use client';

import { useNavigation } from '@/context/NavigationContext';
import { ZoneId } from '@/constants/zones';

// Nav links in display order
const navLinks: { id: ZoneId | 'home'; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'projects', label: 'Projects' },
  { id: 'gallery', label: 'Gallery' },
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
      <div className="flex justify-center items-center gap-4 sm:gap-6 md:gap-10 py-4 px-4">
        {navLinks.map((link, index) => {
          const isActive = targetZone === link.id;
          return (
            <button
              key={link.id}
              onClick={() => handleClick(link.id as ZoneId)}
              className="font-pixel text-[16px] sm:text-[20px] md:text-2xl pointer-events-auto transition-all duration-200 hover:scale-110"
              style={{
                color: isActive ? '#ffffff' : '#bbbbbb',
                textShadow: isActive
                  ? '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
                  : '0 0 10px rgba(255, 255, 255, 0.3)',
                opacity: isActive ? 1 : 0.85,
                // Subtle floating offset per link
                transform: `translateY(${Math.sin(index * 0.8) * 2}px)`,
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
