import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';

// Press Start 2P - classic 8-bit pixel font
const PIXEL_FONT = '/fonts/PressStart2P.ttf';

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

const links: NavLink[] = [
  { label: 'Projects', href: '/projects' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Resume', href: '/resume' },
  { label: 'About Me', href: '/about' },
  { label: 'Book', href: '/book' },
  { label: 'Writing', href: 'https://souldirection.substack.com', external: true },
];

interface NavLinkTextProps {
  link: NavLink;
  position: [number, number, number];
  index: number;
}

function NavLinkText({ link, position, index }: NavLinkTextProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [meshRef, setMeshRef] = useState<THREE.Mesh | null>(null);

  // Staggered floating animation
  useFrame((state) => {
    if (meshRef) {
      const offset = index * 0.4;
      meshRef.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.6 + offset) * 0.08;
    }
  });

  const handleClick = () => {
    if (link.external) {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    } else {
      router.push(link.href);
    }
  };

  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'default';
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
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
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
            key={link.href}
            link={link}
            position={[x, y, 0]}
            index={index}
          />
        );
      })}
    </group>
  );
}
