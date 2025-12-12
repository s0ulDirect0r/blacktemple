import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CoronaParticlesProps {
  coreRadius?: number;
  count?: number;
  intensityRef: React.MutableRefObject<number>;
}

export default function CoronaParticles({
  coreRadius = 0.25,
  count = 1000,
  intensityRef,
}: CoronaParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Generate particle positions in a tight shell around the core
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Random point on sphere surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      // Tight to surface: 1.02 to 1.08 times core radius
      const radiusMultiplier = 1.02 + Math.random() * 0.06;
      const r = coreRadius * radiusMultiplier;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [coreRadius, count]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Slow rotation
    if (pointsRef.current) {
      pointsRef.current.rotation.y = time * 0.05;
      pointsRef.current.rotation.x = time * 0.03;
    }

    // Adjust opacity based on intensity
    if (materialRef.current) {
      materialRef.current.opacity = 0.6 + intensityRef.current * 0.2;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.012}
        color={0xffffaa}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
