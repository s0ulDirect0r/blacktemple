import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EnergyStreaksProps {
  coreRadius?: number;
  count?: number;
  intensityRef: React.MutableRefObject<number>;
}

export default function EnergyStreaks({
  coreRadius = 0.25,
  count = 300,
  intensityRef,
}: EnergyStreaksProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Generate fast-moving particles
  const { positions, velocities, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    // Brighter, more saturated color
    const baseColor = new THREE.Color(0xffee66);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const startRadius = coreRadius * (1.0 + Math.random() * 0.05);

      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);

      pos[i * 3] = x * startRadius;
      pos[i * 3 + 1] = y * startRadius;
      pos[i * 3 + 2] = z * startRadius;

      // Faster velocity (0.08-0.20)
      const speed = 0.08 + Math.random() * 0.12;
      vel[i * 3] = x * speed;
      vel[i * 3 + 1] = y * speed;
      vel[i * 3 + 2] = z * speed;

      // Bright variation
      const colorVariation = 0.95 + Math.random() * 0.1;
      col[i * 3] = baseColor.r * colorVariation;
      col[i * 3 + 1] = baseColor.g * colorVariation;
      col[i * 3 + 2] = baseColor.b * colorVariation;
    }

    return { positions: pos, velocities: vel, colors: col };
  }, [coreRadius, count]);

  // Animation state
  const particleLife = useRef(new Float32Array(count).fill(0).map(() => Math.random()));
  const maxLife = 1.5; // Shorter life = more frequent respawns

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.getAttribute('position');
    const velAttr = pointsRef.current.geometry.getAttribute('velocity');
    const life = particleLife.current;
    const intensity = intensityRef.current;

    for (let i = 0; i < count; i++) {
      life[i] += delta;

      if (life[i] > maxLife) {
        life[i] = 0;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const startRadius = coreRadius * (1.0 + Math.random() * 0.05);

        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.sin(phi) * Math.sin(theta);
        const z = Math.cos(phi);

        posAttr.setXYZ(i, x * startRadius, y * startRadius, z * startRadius);

        const speed = 0.08 + Math.random() * 0.12;
        velAttr.setXYZ(i, x * speed, y * speed, z * speed);
      } else {
        // Fast outward movement
        const speedMult = 1.5 * intensity;
        const vx = velAttr.getX(i) * speedMult;
        const vy = velAttr.getY(i) * speedMult;
        const vz = velAttr.getZ(i) * speedMult;

        posAttr.setXYZ(
          i,
          posAttr.getX(i) + vx * delta,
          posAttr.getY(i) + vy * delta,
          posAttr.getZ(i) + vz * delta
        );
      }
    }

    posAttr.needsUpdate = true;

    // Update material opacity based on intensity
    if (materialRef.current) {
      materialRef.current.opacity = 0.4 + intensity * 0.2;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-velocity"
          args={[velocities, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.025}
        color={0xffee66}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
