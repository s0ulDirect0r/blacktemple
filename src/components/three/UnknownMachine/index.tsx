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

  const lastPointer = useRef({ x: 0, y: 0 });
  const pointerStaleTime = useRef(0);

  useFrame((state) => {
    const pointer = state.pointer;
    const time = state.clock.elapsedTime;

    // Detect if pointer has moved
    const pointerMoved =
      Math.abs(pointer.x - lastPointer.current.x) > 0.001 ||
      Math.abs(pointer.y - lastPointer.current.y) > 0.001;

    if (pointerMoved) {
      lastPointer.current = { x: pointer.x, y: pointer.y };
      pointerStaleTime.current = time;
    }

    // If pointer hasn't moved for 0.5s, assume mouse left canvas
    const timeSinceMove = time - pointerStaleTime.current;
    const isStale = timeSinceMove > 0.5;

    // Calculate base intensity from pointer distance
    const distance = Math.sqrt(pointer.x ** 2 + pointer.y ** 2);
    const pointerIntensity = 1 + (1 - Math.min(distance, 1)) * 0.8;

    // If stale, lerp back to base intensity of 1.0
    if (isStale) {
      intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, 1.0, 0.02);
    } else {
      intensityRef.current = pointerIntensity;
    }
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
