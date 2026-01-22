import { useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigation } from '@/context/NavigationContext';
import { ZoneId } from '@/constants/zones';

// Three.js requires direct mutation of mesh properties - this is the standard pattern
/* eslint-disable react-hooks/immutability */

// Press Start 2P - classic 8-bit pixel font
const PIXEL_FONT = '/fonts/PressStart2P.ttf';

// Home camera constants (from LayoutContent.tsx camera config)
const HOME_CAMERA_Z = 15;
const HOME_CAMERA_FOV = 60;

// Calculate the visible world-space dimensions at z=0 when camera is at home position
// Formula: visibleHeight = 2 * tan(FOV/2) * distance
const HOME_VISIBLE_HEIGHT =
  2 * Math.tan((HOME_CAMERA_FOV * Math.PI) / 180 / 2) * HOME_CAMERA_Z;

interface NavLink {
  label: string;
  zoneId: ZoneId | null;
  external?: boolean;
  externalUrl?: string;
}

// Links split into above/below machine groups for mobile layout
const linksAbove: NavLink[] = [
  { label: 'Projects', zoneId: 'projects' },
  { label: 'Writing', zoneId: null, external: true, externalUrl: 'https://souldirection.substack.com' },
  { label: 'Gallery', zoneId: 'gallery' },
];

const linksBelow: NavLink[] = [
  { label: 'Book', zoneId: 'book' },
  { label: 'Resume', zoneId: 'resume' },
  { label: 'About Me', zoneId: 'about' },
];

// All links combined for desktop star pattern
const allLinks: NavLink[] = [...linksAbove, ...linksBelow];

interface NavLinkTextProps {
  link: NavLink;
  position: [number, number, number];
  index: number;
  fontSize: number;
}

function NavLinkText({ link, position, index, fontSize }: NavLinkTextProps) {
  const { navigateToZone } = useNavigation();
  const [hovered, setHovered] = useState(false);
  const [meshRef, setMeshRef] = useState<THREE.Mesh | null>(null);

  useCursor(hovered, 'pointer', 'default');

  // Staggered floating animation
  useFrame((state) => {
    if (meshRef) {
      const offset = index * 0.4;
      meshRef.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.6 + offset) * 0.08;
    }
  });

  const handleClick = () => {
    if (link.external && link.externalUrl) {
      window.open(link.externalUrl, '_blank', 'noopener,noreferrer');
    } else if (link.zoneId) {
      navigateToZone(link.zoneId);
    }
  };

  return (
    <Text
      ref={setMeshRef}
      position={position}
      font={PIXEL_FONT}
      fontSize={fontSize}
      letterSpacing={0.02}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {link.label.toUpperCase()}
      <meshBasicMaterial
        color={hovered ? '#ffffff' : '#bbbbbb'}
        toneMapped={false}
        opacity={hovered ? 1 : 0.85}
        transparent
      />
    </Text>
  );
}

export default function NavLinks() {
  // Use `size` (canvas pixel dimensions) for responsive sizing
  // Canvas size stays constant regardless of camera position/movement
  const { size } = useThree();

  // Memoize layout calculations based on canvas size (stable during camera movement)
  const { fontSize, isPortrait, homeVisibleWidth, homeVisibleHeight } = useMemo(() => {
    const aspect = size.width / size.height;
    const isPortraitMode = aspect < 1;

    // Calculate home viewport dimensions from fixed home camera position
    const visibleWidth = HOME_VISIBLE_HEIGHT * aspect;

    // Scale factor: convert pixel-based sizing intent to world units
    // Use a reference width (1920px) to normalize sizing across screen sizes
    const scaleFactor = Math.min(size.width, 1920) / 1920;

    return {
      // Font size: base of 0.715 world units, scaled by screen size, capped
      fontSize: Math.min(0.94, Math.max(0.52, 0.715 * scaleFactor)),
      isPortrait: isPortraitMode,
      homeVisibleWidth: visibleWidth,
      homeVisibleHeight: HOME_VISIBLE_HEIGHT,
    };
  }, [size.width, size.height]);

  if (isPortrait) {
    // Portrait: Column layout - links above and below the machine
    // Spacing is 6% of home visible height, minimum 1.0 for readability
    const verticalSpacing = Math.max(1.0, homeVisibleHeight * 0.06);
    // Machine is centered at y=0, glow extends ~3 units.
    // Above group: bottom link (Gallery) at y=2, just above machine
    const aboveBottomY = 2.0;
    const aboveStartY = aboveBottomY + (linksAbove.length - 1) * verticalSpacing;
    // Below group: top link (Book) at y=-4, below the machine glow
    const belowStartY = -4.0;

    return (
      <group position={[0, 0, 0]}>
        {/* Links above the machine */}
        {linksAbove.map((link, index) => (
          <NavLinkText
            key={link.label}
            link={link}
            position={[0, aboveStartY - index * verticalSpacing, 0]}
            index={index}
            fontSize={fontSize}
          />
        ))}
        {/* Links below the machine */}
        {linksBelow.map((link, index) => (
          <NavLinkText
            key={link.label}
            link={link}
            position={[0, belowStartY - index * verticalSpacing, 0]}
            index={index + linksAbove.length}
            fontSize={fontSize}
          />
        ))}
      </group>
    );
  }

  // Wider screens: 6-point star pattern around the machine
  // Star radius is 20% of home visible width, capped at reasonable sizes
  const radius = Math.min(5, Math.max(3, homeVisibleWidth * 0.2));

  return (
    <group position={[0, 0, 0]}>
      {allLinks.map((link, index) => {
        // 6 points of a star, starting from top and going clockwise
        const angle = (Math.PI / 2) - (index * (2 * Math.PI / 6));
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius - 0.8;

        return (
          <NavLinkText
            key={link.label}
            link={link}
            position={[x, y, 0]}
            index={index}
            fontSize={fontSize}
          />
        );
      })}
    </group>
  );
}
