'use client';

import { Component, useSyncExternalStore, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import StarField from '@/components/three/StarField';

function subscribeVisibility(notify: () => void) {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
}

// Leave the CSS sky visible if WebGL is unavailable on a visitor's device.
class SkyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function Starfield3D() {
  const visible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);
  return <SkyBoundary>
    <Canvas
      camera={{ position: [0, 0, 15], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
      frameloop={visible ? 'always' : 'never'}
      fallback={<span />}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#000000']} />
      <StarField />
    </Canvas>
  </SkyBoundary>;
}
