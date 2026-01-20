'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { NavigationProvider, useNavigation } from '@/context/NavigationContext';
import StarField from '@/components/three/StarField';
import TempleText from '@/components/three/TempleText';
import NavLinks from '@/components/three/NavLinks';
import UnknownMachine from '@/components/three/UnknownMachine';
import CameraController from '@/components/three/CameraController';
import SceneSetup from '@/components/three/SceneSetup';
import ZoneOverlay from '@/components/ZoneOverlay';

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

function ThreeScene() {
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

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      {/* Persistent 3D scene as background */}
      <ThreeScene />

      {/* Zone content overlays (rendered as regular HTML outside Canvas) */}
      <ZoneOverlay />

      {/* Page content (for routes that still render content) */}
      <main className="relative z-10 pointer-events-none">
        <div className="pointer-events-auto">
          {children}
        </div>
      </main>
    </NavigationProvider>
  );
}
