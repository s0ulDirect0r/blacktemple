import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useCursor } from '@react-three/drei';
import * as THREE from 'three';

// Press Start 2P - classic 8-bit pixel font
const PIXEL_FONT = '/fonts/PressStart2P.ttf';

interface TempleTextProps {
  onClick?: () => void;
}

export default function TempleText({ onClick }: TempleTextProps) {
  const textRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useCursor(hovered, 'pointer', 'default');

  const baseY = 6; // Position near top of canvas

  // Subtle floating animation
  useFrame((state) => {
    if (textRef.current) {
      textRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
    }
  });

  return (
    <Text
      ref={textRef}
      font={PIXEL_FONT}
      fontSize={1.5}
      maxWidth={40}
      lineHeight={1.4}
      letterSpacing={0.05}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      THE BLACK TEMPLE
      <meshBasicMaterial
        color={hovered ? '#ffffff' : '#eeeeee'}
        toneMapped={false}
        opacity={hovered ? 1 : 0.9}
        transparent
      />
    </Text>
  );
}
