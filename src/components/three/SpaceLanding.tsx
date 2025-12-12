'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import StarField from '@/components/three/StarField';
import TempleText from '@/components/three/TempleText';
import SceneSetup from '@/components/three/SceneSetup';
import NavLinks from '@/components/three/NavLinks';
import UnknownMachine from '@/components/three/UnknownMachine';

export default function SpaceLanding() {
  return (
    <div className="fixed inset-0 w-full h-full bg-black">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#000000']} />
        <Suspense fallback={null}>
          <SceneSetup />
          <StarField />
          <TempleText />
          <NavLinks />
          <UnknownMachine />
        </Suspense>
      </Canvas>
    </div>
  );
}
