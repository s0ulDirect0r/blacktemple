import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CoreStarProps {
  radius?: number;
  intensityRef: React.MutableRefObject<number>;
}

export default function CoreStar({ radius = 0.25, intensityRef }: CoreStarProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const intensity = intensityRef.current;

    // Cycle through hue (0-1 range)
    const hue = (time * 0.1) % 1;
    const color = new THREE.Color().setHSL(hue, 1.0, 0.5);
    const glowColor = new THREE.Color().setHSL(hue, 0.8, 0.6);

    // Pulse the core
    if (coreRef.current) {
      const pulse = 1 + Math.sin(time * 3) * 0.15;
      coreRef.current.scale.setScalar(pulse);
      const material = coreRef.current.material as THREE.MeshStandardMaterial;
      material.color.copy(color);
      material.emissive.copy(color);
    }

    // Update inner glow
    if (innerGlowRef.current) {
      const material = innerGlowRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.8 + intensity * 0.4;
      material.color.copy(glowColor);
      material.emissive.copy(glowColor);
    }

    // Update outer glow
    if (outerGlowRef.current) {
      const material = outerGlowRef.current.material as THREE.MeshBasicMaterial;
      material.color.copy(glowColor);
    }
  });

  return (
    <group>
      {/* Bright emissive core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={0xffff88}
          emissive={0xffff44}
          emissiveIntensity={1.5}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Inner glow sphere - slightly larger */}
      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[radius * 1.6, 32, 32]} />
        <meshStandardMaterial
          color={0xffffaa}
          emissive={0xffff66}
          emissiveIntensity={1}
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Outer glow sphere - even larger, more transparent */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[radius * 2.5, 32, 32]} />
        <meshBasicMaterial
          color={0xffffcc}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
