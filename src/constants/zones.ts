import { Vector3 } from 'three';

export type ZoneId = 'home' | 'gallery' | 'book' | 'projects' | 'resume' | 'about';

export interface ZoneDefinition {
  id: ZoneId;
  cameraPos: [number, number, number];
  lookAt: [number, number, number];
  path: string;
  label: string;
  external?: boolean;
}

// Zone layout:
//                    Projects [0, 20, 0]
//                         ↑
//                         |
// Book [-25, 0, 0]  ←  HOME [0, 0, 0]  →  Gallery [25, 0, 0]
//                         |
//                         ↓
//                    Resume [0, -20, 0]
//
// About is placed behind/below home at [0, -10, -20]

export const ZONES: Record<ZoneId, ZoneDefinition> = {
  home: {
    id: 'home',
    cameraPos: [0, 0, 15],
    lookAt: [0, 0, 0],
    path: '/',
    label: 'Home',
  },
  gallery: {
    id: 'gallery',
    cameraPos: [25, 0, 12],
    lookAt: [25, 0, 0],
    path: '/gallery',
    label: 'Gallery',
  },
  book: {
    id: 'book',
    cameraPos: [-25, 0, 12],
    lookAt: [-25, 0, 0],
    path: '/book',
    label: 'Book',
  },
  projects: {
    id: 'projects',
    cameraPos: [0, 20, 12],
    lookAt: [0, 20, 0],
    path: '/projects',
    label: 'Projects',
  },
  resume: {
    id: 'resume',
    cameraPos: [0, -20, 12],
    lookAt: [0, -20, 0],
    path: '/resume',
    label: 'Resume',
  },
  about: {
    id: 'about',
    cameraPos: [0, -10, -8],
    lookAt: [0, -10, -20],
    path: '/about',
    label: 'About Me',
  },
};

// Map paths to zone IDs for URL sync
export function pathToZoneId(pathname: string): ZoneId {
  // Handle exact matches first
  if (pathname === '/') return 'home';

  // Handle path prefixes (e.g., /gallery/something still maps to gallery zone)
  for (const zone of Object.values(ZONES)) {
    if (zone.path !== '/' && pathname.startsWith(zone.path)) {
      return zone.id;
    }
  }

  // Default to home for unknown paths
  return 'home';
}

// Helper to get Vector3 from zone position tuple
export function getZoneCameraPosition(zoneId: ZoneId): Vector3 {
  const zone = ZONES[zoneId];
  return new Vector3(...zone.cameraPos);
}

export function getZoneLookAt(zoneId: ZoneId): Vector3 {
  const zone = ZONES[zoneId];
  return new Vector3(...zone.lookAt);
}

// Camera transition speed (lower = slower, smoother)
export const CAMERA_LERP_SPEED = 0.03;

// Distance threshold to consider camera "arrived" at zone (higher = appears sooner)
export const ARRIVAL_THRESHOLD = 2.0;
