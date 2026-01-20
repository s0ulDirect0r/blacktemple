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

  // Scale font size based on viewport width for true responsiveness
  const isMobile = size.width < 640;
  // Scale fontSize: ~35% bigger than original
  const fontSize = isMobile ? Math.max(0.54, size.width / 555) : 1.5;
  // Constrain maxWidth on mobile to force wrapping if needed
  const maxWidth = isMobile ? 8 : 40;
  const baseY = isMobile ? 6.6 : 6; // Position near top of canvas

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
