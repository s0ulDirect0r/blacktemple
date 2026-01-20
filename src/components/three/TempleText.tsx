import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
  const { size } = useThree();

  useCursor(hovered, 'pointer', 'default');

  // Fluid responsive scaling
  // fontSize scales from ~0.9 at 375px to ~1.5 at 1400px
  const fontSize = Math.min(1.5, Math.max(0.9, size.width / 500));
  // Only wrap on narrow mobile screens (< 500px), otherwise no wrapping
  const maxWidth = size.width < 500 ? 8 : 100;
  // baseY adjusts for wrapped text on smaller screens
  const baseY = size.width < 500 ? 6.6 : 6;

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
      fontSize={fontSize}
      maxWidth={maxWidth}
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
