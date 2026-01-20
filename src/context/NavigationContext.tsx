'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ZoneId, ZONES, pathToZoneId } from '@/constants/zones';

interface NavigationContextType {
  currentZone: ZoneId;
  targetZone: ZoneId;
  isTransitioning: boolean;
  navigateToZone: (zoneId: ZoneId) => void;
  onTransitionComplete: () => void;
  prefersReducedMotion: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

// Use useSyncExternalStore for media query to avoid effect-based setState
function useReducedMotion() {
  return useSyncExternalStore(
    (callback) => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addEventListener('change', callback);
      return () => mediaQuery.removeEventListener('change', callback);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false // Server-side fallback
  );
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // Determine initial zone from URL
  const initialZone = pathToZoneId(pathname);

  const [currentZone, setCurrentZone] = useState<ZoneId>(initialZone);
  const [targetZone, setTargetZone] = useState<ZoneId>(initialZone);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sync with URL changes (browser back/forward)
  // Using a ref to track the last pathname to avoid state cascade
  const zoneFromPath = pathToZoneId(pathname);
  if (zoneFromPath !== targetZone && !isTransitioning) {
    // This is intentional - we want synchronous updates when pathname changes
    setTargetZone(zoneFromPath);
    setIsTransitioning(true);
  }

  const navigateToZone = useCallback(
    (zoneId: ZoneId) => {
      if (zoneId === targetZone) return;

      const zone = ZONES[zoneId];
      if (!zone) return;

      // Handle external links (like Writing -> Substack)
      if (zone.external) {
        window.open(zone.path, '_blank', 'noopener,noreferrer');
        return;
      }

      // Update URL first (this triggers route change)
      router.push(zone.path);

      // Start transition
      setTargetZone(zoneId);
      setIsTransitioning(true);

      // If reduced motion, skip transition
      if (prefersReducedMotion) {
        setCurrentZone(zoneId);
        setIsTransitioning(false);
      }
    },
    [targetZone, router, prefersReducedMotion]
  );

  const onTransitionComplete = useCallback(() => {
    setCurrentZone(targetZone);
    setIsTransitioning(false);
  }, [targetZone]);

  const value = useMemo(
    () => ({
      currentZone,
      targetZone,
      isTransitioning,
      navigateToZone,
      onTransitionComplete,
      prefersReducedMotion,
    }),
    [
      currentZone,
      targetZone,
      isTransitioning,
      navigateToZone,
      onTransitionComplete,
      prefersReducedMotion,
    ]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
