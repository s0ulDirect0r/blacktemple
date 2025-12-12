import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import * as THREE from 'three';
import CoreStar from './CoreStar';
import CoronaParticles from './CoronaParticles';
import SurfaceActivity from './SurfaceActivity';
import EnergyStreaks from './EnergyStreaks';
import HeroBeams from './HeroBeams';
import SwirlingAura from './SwirlingAura';

export const RAINBOW_COLORS = [
  '#ff0000', // red
  '#ff7f00', // orange
  '#ffff00', // yellow
  '#00ff00', // green
  '#0000ff', // blue
  '#8b00ff', // violet
];

interface UnknownMachineProps {
  position?: [number, number, number];
}

export default function UnknownMachine({ position = [0, -0.8, 0] }: UnknownMachineProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const intensityRef = useRef(1);

  useCursor(hovered, 'pointer', 'default');

  // Organic pulsing intensity using layered sine waves
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Layer multiple frequencies for pseudo-random feel
    const slow = Math.sin(t * 0.3) * 0.3;
    const medium = Math.sin(t * 0.7 + 1.5) * 0.2;
    const fast = Math.sin(t * 1.3 + 3.0) * 0.1;
    const veryFast = Math.sin(t * 2.1 + 0.5) * 0.05;

    // Base of 1.0, ranging roughly 0.65 to 1.65
    intensityRef.current = 1.0 + slow + medium + fast + veryFast;
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Core star with emissive glow */}
      <CoreStar radius={0.25} intensityRef={intensityRef} />

      {/* Corona - tight particle halo */}
      <CoronaParticles coreRadius={0.25} intensityRef={intensityRef} />

      {/* Swirling aura - noise-perturbed rainbow particles */}
      <SwirlingAura coreRadius={0.25} intensityRef={intensityRef} />

      {/* Surface activity - disabled for now */}
      {/* <SurfaceActivity coreRadius={0.25} intensityRef={intensityRef} /> */}

      {/* Energy streaks - disabled for now */}
      {/* <EnergyStreaks coreRadius={0.25} intensityRef={intensityRef} /> */}

      {/* Hero beams - rainbow colored rays - disabled for now */}
      {/* <HeroBeams coreRadius={0.25} intensityRef={intensityRef} /> */}

      {/* Invisible hitbox for better click detection */}
      <mesh visible={false}>
        <sphereGeometry args={[2.5, 16, 16]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}
