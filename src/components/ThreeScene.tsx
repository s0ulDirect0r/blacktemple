'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useNavigation } from '@/context/NavigationContext';
import StarField from '@/components/three/StarField';
import TempleText from '@/components/three/TempleText';
import NavLinks from '@/components/three/NavLinks';
import UnknownMachine from '@/components/three/UnknownMachine';
import CameraController from '@/components/three/CameraController';
import SceneSetup from '@/components/three/SceneSetup';

function SceneContent() {
  const { navigateToZone } = useNavigation();

  return (
    <>
      <CameraController />
      <SceneSetup />
      <StarField />
      <TempleText onClick={() => navigateToZone('home')} />
      <NavLinks />
      <UnknownMachine />
    </>
  );
}

export default function ThreeScene() {
  return (
    <div className="fixed inset-0 w-full h-full bg-black">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#000000']} />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
        <EffectComposer>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.95}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

