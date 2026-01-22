import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, useCursor } from '@react-three/drei';
import * as THREE from 'three';

// Press Start 2P - classic 8-bit pixel font
const PIXEL_FONT = '/fonts/PressStart2P.ttf';

// Home camera constants (from LayoutContent.tsx camera config)
const HOME_CAMERA_Z = 15;
const HOME_CAMERA_FOV = 60;

// Calculate the visible world-space dimensions at z=0 when camera is at home position
// Formula: visibleHeight = 2 * tan(FOV/2) * distance
const HOME_VISIBLE_HEIGHT =
  2 * Math.tan((HOME_CAMERA_FOV * Math.PI) / 180 / 2) * HOME_CAMERA_Z;

interface TempleTextProps {
  onClick?: () => void;
}

export default function TempleText({ onClick }: TempleTextProps) {
  const textRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  // Use `size` (canvas pixel dimensions) for responsive sizing
  // Canvas size stays constant regardless of camera position/movement
  const { size } = useThree();

  useCursor(hovered, 'pointer', 'default');

  // Memoize layout calculations based on canvas size (stable during camera movement)
  const { fontSize, maxWidth, baseY } = useMemo(() => {
    const aspect = size.width / size.height;
    const isPortrait = aspect < 1;

    // Calculate home viewport width from height and current aspect ratio
    const homeVisibleWidth = HOME_VISIBLE_HEIGHT * aspect;

    // Scale factor: convert pixel-based sizing intent to world units
    // Use a reference width (1920px) to normalize sizing across screen sizes
    const scaleFactor = Math.min(size.width, 1920) / 1920;

    return {
      // Font size: base of 1.56 world units, scaled by screen size, capped
      fontSize: Math.min(1.95, Math.max(1.04, 1.56 * scaleFactor)),
      // Wrap text on portrait screens using calculated home viewport
      maxWidth: isPortrait ? homeVisibleWidth * 0.85 : 100,
      // Position title at 35% from top of visible area using fixed home height
      baseY: HOME_VISIBLE_HEIGHT * 0.35,
    };
  }, [size.width, size.height]);

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
