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
  const { viewport } = useThree();

  useCursor(hovered, 'pointer', 'default');

  // Use aspect ratio to detect portrait vs landscape orientation
  const aspect = viewport.width / viewport.height;
  const isPortrait = aspect < 1;

  // Font size: 5% of viewport width, capped at reasonable range
  const fontSize = Math.min(1.5, Math.max(0.8, viewport.width * 0.05));
  // Wrap text on portrait screens to fit within view
  const maxWidth = isPortrait ? viewport.width * 0.85 : 100;
  // Position title at 35% from top of visible area
  const baseY = viewport.height * 0.35;

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
