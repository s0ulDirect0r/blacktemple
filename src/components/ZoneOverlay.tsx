'use client';

import { useNavigation } from '@/context/NavigationContext';
import GalleryZoneContent from './zones/GalleryZoneContent';
import BookZoneContent from './zones/BookZoneContent';
import ProjectsZoneContent from './zones/ProjectsZoneContent';
import ResumeZoneContent from './zones/ResumeZoneContent';
import AboutZoneContent from './zones/AboutZoneContent';

// Renders zone content as HTML overlays (outside the Canvas)
// This provides better styling control and avoids 3D transform issues
export default function ZoneOverlay() {
  const { targetZone, isTransitioning } = useNavigation();

  // Don't show overlay for home zone
  if (targetZone === 'home') {
    return null;
  }

  // Fade in when arriving at zone, fade out when leaving
  const isVisible = !isTransitioning;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none"
      style={{
        transition: 'opacity 0.5s ease-in-out',
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div
        className="pointer-events-auto w-[90vw] max-w-6xl h-[85vh] overflow-auto"
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
        }}
      >
        {targetZone === 'gallery' && <GalleryZoneContent />}
        {targetZone === 'book' && <BookZoneContent />}
        {targetZone === 'projects' && <ProjectsZoneContent />}
        {targetZone === 'resume' && <ResumeZoneContent />}
        {targetZone === 'about' && <AboutZoneContent />}
      </div>
    </div>
  );
}
