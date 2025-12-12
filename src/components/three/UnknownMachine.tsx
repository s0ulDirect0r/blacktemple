import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import * as THREE from 'three';

const RAINBOW_COLORS = [
  '#ff0000', // red
  '#ff7f00', // orange
  '#ffff00', // yellow
  '#00ff00', // green
  '#0000ff', // blue
  '#8b00ff', // violet
];

interface RayProps {
  color: string;
  angle: number;
  intensity: number;
}

function Ray({ color, angle, intensity }: RayProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Position ray at angle from center
  const position = useMemo(() => {
    const distance = 0.8;
    return [
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      0,
    ] as [number, number, number];
  }, [angle]);

  // Ray points outward from center
  const rotation = useMemo(() => {
    return [0, 0, angle - Math.PI / 2] as [number, number, number];
  }, [angle]);

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <planeGeometry args={[0.15, 2.5 * intensity]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.7 * intensity}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default function UnknownMachine() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const raysRef = useRef<THREE.Group>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const intensityRef = useRef(1);

  useCursor(hovered, 'pointer', 'default');

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Calculate intensity
    const pointer = state.pointer;
    const distance = Math.sqrt(pointer.x ** 2 + pointer.y ** 2);
    const proximityIntensity = 1 + (1 - Math.min(distance, 1)) * 0.8;
    intensityRef.current = hovered ? 1.5 : proximityIntensity;

    // Pulse the core
    if (coreRef.current) {
      const pulse = 1 + Math.sin(time * 3) * 0.15;
      coreRef.current.scale.setScalar(pulse);
    }

    // Pulse the glow and update opacity
    if (glowRef.current) {
      const glowPulse = 1 + Math.sin(time * 2) * 0.2;
      glowRef.current.scale.setScalar(3 * glowPulse * intensityRef.current);
      const spriteMaterial = glowRef.current.material as THREE.SpriteMaterial;
      spriteMaterial.opacity = 0.6 * intensityRef.current;
    }

    // Update inner glow opacity
    if (innerGlowRef.current) {
      const material = innerGlowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.4 * intensityRef.current;
    }

    // Rotate rays
    if (raysRef.current) {
      raysRef.current.rotation.z += 0.008;
    }
  });

  // Create a radial gradient texture for the glow
  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(200, 220, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(150, 180, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  return (
    <group
      ref={groupRef}
      position={[0, -0.8, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Bright core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Inner glow sphere */}
      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial
          color="#aaccff"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow sprite */}
      <sprite ref={glowRef} scale={[3, 3, 1]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* Rainbow rays */}
      <group ref={raysRef}>
        {RAINBOW_COLORS.map((color, i) => (
          <Ray
            key={color}
            color={color}
            angle={(i * Math.PI * 2) / RAINBOW_COLORS.length}
            intensity={1}
          />
        ))}
      </group>

      {/* Invisible hitbox for better click detection */}
      <mesh visible={false}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}
