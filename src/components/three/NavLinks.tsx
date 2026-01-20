import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
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

const links: NavLink[] = [
  { label: 'Projects', zoneId: 'projects' },
  { label: 'Gallery', zoneId: 'gallery' },
  { label: 'Resume', zoneId: 'resume' },
  { label: 'About Me', zoneId: 'about' },
  { label: 'Book', zoneId: 'book' },
  { label: 'Writing', zoneId: null, external: true, externalUrl: 'https://souldirection.substack.com' },
];

interface NavLinkTextProps {
  link: NavLink;
  position: [number, number, number];
  index: number;
}

function NavLinkText({ link, position, index }: NavLinkTextProps) {
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
      fontSize={0.72}
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
  // Arrange links in a 6-point star pattern around the title
  const radius = 5;

  return (
    <group position={[0, 0, 0]}>
      {links.map((link, index) => {
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
          />
        );
      })}
    </group>
  );
}
