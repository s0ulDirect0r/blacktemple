import { useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigation } from '@/context/NavigationContext';
import { ZoneId } from '@/constants/zones';

// Three.js requires direct mutation of mesh properties - this is the standard pattern
/* eslint-disable react-hooks/immutability */

// Press Start 2P - classic 8-bit pixel font
const PIXEL_FONT = '/fonts/PressStart2P.ttf';

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
  const { size } = useThree();

  // Use column layout for narrow screens, star pattern for wider
  const useColumnLayout = size.width < 500;

  // Fluid scaling for font size: ~0.6 at 375px to ~0.72 at 1400px
  const fontSize = Math.min(0.72, Math.max(0.6, size.width / 1000));

  if (useColumnLayout) {
    // Narrow screens: Column layout - links above and below the machine
    const verticalSpacing = Math.max(0.9, size.width / 400);
    const aboveStartY = 3.2;
    const belowStartY = -2.8;

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
  // Fluid radius: ~3 at 500px to ~5 at 1400px
  const radius = Math.min(5, Math.max(3, size.width / 280));

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
