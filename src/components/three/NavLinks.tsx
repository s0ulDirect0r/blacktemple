import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

const links: NavLink[] = [
  { label: 'Gallery', href: '/gallery' },
  { label: 'Writing', href: 'https://souldirection.substack.com', external: true },
  { label: 'Projects', href: '/projects' },
  { label: 'Book', href: '/book' },
  { label: 'Resume', href: '/resume' },
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
      fontSize={0.4}
      letterSpacing={0.08}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {link.label.toUpperCase()}
      <meshStandardMaterial
        color={hovered ? '#ffffff' : '#888888'}
        emissive={hovered ? '#333333' : '#000000'}
        metalness={0.2}
        roughness={0.8}
      />
    </Text>
  );
}

export default function NavLinks() {
  // Calculate positions to spread links evenly
  const totalWidth = 12;
  const spacing = totalWidth / (links.length - 1);
  const startX = -totalWidth / 2;

  return (
    <group position={[0, -2, 0]}>
      {links.map((link, index) => (
        <NavLinkText
          key={link.href}
          link={link}
          position={[startX + index * spacing, 0, 0]}
          index={index}
        />
      ))}
    </group>
  );
}
