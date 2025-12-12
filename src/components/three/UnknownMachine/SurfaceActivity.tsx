import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SurfaceActivityProps {
  coreRadius?: number;
  count?: number;
  intensityRef: React.MutableRefObject<number>;
}

export default function SurfaceActivity({
  coreRadius = 0.25,
  count = 1200,
  intensityRef,
}: SurfaceActivityProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Generate particles with positions, velocities, and colors
  const { positions, velocities, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    // Warm yellow-orange color palette
    const baseColor = new THREE.Color(0xffdd44);

    for (let i = 0; i < count; i++) {
      // Random point on sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      // Start at surface
      const startRadius = coreRadius * (1.0 + Math.random() * 0.1);

      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);

      pos[i * 3] = x * startRadius;
      pos[i * 3 + 1] = y * startRadius;
      pos[i * 3 + 2] = z * startRadius;

      // Radial outward velocity (0.03-0.11)
      const speed = 0.03 + Math.random() * 0.08;
      vel[i * 3] = x * speed;
      vel[i * 3 + 1] = y * speed;
      vel[i * 3 + 2] = z * speed;

      // Slight color variation
      const colorVariation = 0.9 + Math.random() * 0.2;
      col[i * 3] = baseColor.r * colorVariation;
      col[i * 3 + 1] = baseColor.g * colorVariation;
      col[i * 3 + 2] = baseColor.b * colorVariation;
    }

    return { positions: pos, velocities: vel, colors: col };
  }, [coreRadius, count]);

  // Animation state for particle lifecycle
  const particleLife = useRef(new Float32Array(count).fill(0).map(() => Math.random()));
  const maxLife = 3.0; // seconds before respawn

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.getAttribute('position');
    const velAttr = pointsRef.current.geometry.getAttribute('velocity');
    const life = particleLife.current;
    const intensity = intensityRef.current;

    for (let i = 0; i < count; i++) {
      life[i] += delta;

      // Respawn particle when life exceeds max
      if (life[i] > maxLife) {
        life[i] = 0;

        // Reset to surface
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const startRadius = coreRadius * (1.0 + Math.random() * 0.1);

        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.sin(phi) * Math.sin(theta);
        const z = Math.cos(phi);

        posAttr.setXYZ(i, x * startRadius, y * startRadius, z * startRadius);

        // New random velocity
        const speed = 0.03 + Math.random() * 0.08;
        velAttr.setXYZ(i, x * speed, y * speed, z * speed);
      } else {
        // Move particle outward
        const vx = velAttr.getX(i) * intensity;
        const vy = velAttr.getY(i) * intensity;
        const vz = velAttr.getZ(i) * intensity;

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
      const mat = materialRef.current as THREE.PointsMaterial;
      mat.opacity = 0.3 + intensity * 0.15;
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
        size={0.02}
        color={0xffdd44}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
