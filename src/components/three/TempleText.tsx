import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface TempleTextProps {
  onClick?: () => void;
}

export default function TempleText({ onClick }: TempleTextProps) {
  const textRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Subtle floating animation
  useFrame((state) => {
    if (textRef.current) {
      textRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
    }
  });

  const handleClick = () => {
    console.log('The Black Temple clicked');
    onClick?.();
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
      ref={textRef}
      fontSize={1.2}
      maxWidth={20}
      lineHeight={1.2}
      letterSpacing={0.15}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      THE BLACK TEMPLE
      <meshStandardMaterial
        color={hovered ? '#ffffff' : '#e0e0e0'}
        emissive={hovered ? '#404040' : '#1a1a1a'}
        metalness={0.2}
        roughness={0.8}
      />
    </Text>
  );
}
