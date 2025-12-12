import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RAINBOW_COLORS } from './index';

interface HeroBeamsProps {
  coreRadius?: number;
  beamCount?: number;
  beamLength?: number;
  intensityRef: React.MutableRefObject<number>;
}

interface BeamData {
  rotation: THREE.Euler;
  color: THREE.Color;
  pulsePhase: number;
}

export default function HeroBeams({
  coreRadius = 0.25,
  beamCount = 24,
  beamLength = 2.5,
  intensityRef,
}: HeroBeamsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);

  // Generate beam configurations (no materials - use standard material)
  const beams = useMemo<BeamData[]>(() => {
    const beamData: BeamData[] = [];

    for (let i = 0; i < beamCount; i++) {
      // Distribute beams in a sphere using golden angle
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const theta = goldenAngle * i;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / beamCount);

      // Convert to euler rotation
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);

      // Create rotation that points beam outward
      const direction = new THREE.Vector3(x, y, z);
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(up, direction);
      const euler = new THREE.Euler().setFromQuaternion(quaternion);

      // Cycle through rainbow colors
      const colorIndex = i % RAINBOW_COLORS.length;
      const color = new THREE.Color(RAINBOW_COLORS[colorIndex]);

      // Random pulse phase offset
      const pulsePhase = Math.random() * Math.PI * 2;

      beamData.push({ rotation: euler, color, pulsePhase });
    }

    return beamData;
  }, [beamCount]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const intensity = intensityRef.current;

    // Animate beam opacity with pulse
    meshRefs.current.forEach((mesh, i) => {
      if (mesh && mesh.material) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const pulse = 0.4 + 0.3 * Math.sin(time * 2 + beams[i].pulsePhase);
        mat.opacity = pulse * (0.4 + intensity * 0.4);
      }
    });

    // Slow rotation of entire beam group
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.02;
    }
  });

  // Tapered cone geometry offset so base starts at core surface
  const offsetGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.06, 0.015, beamLength, 8, 1, true);
    geo.translate(0, beamLength / 2 + coreRadius * 0.8, 0);
    return geo;
  }, [beamLength, coreRadius]);

  return (
    <group ref={groupRef}>
      {beams.map((beam, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          geometry={offsetGeometry}
          rotation={beam.rotation}
        >
          <meshBasicMaterial
            color={beam.color}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
