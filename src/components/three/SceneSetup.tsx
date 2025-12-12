import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function SceneSetup() {
  const { camera } = useThree();

  // Subtle camera parallax following mouse position
  useFrame((state) => {
    const { pointer } = state;

    // Gentle drift with mouse movement
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      pointer.x * 0.5,
      0.02
    );
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      pointer.y * 0.3,
      0.02
    );

    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      {/* Ambient light for base visibility */}
      <ambientLight intensity={0.4} />

      {/* Point light from camera direction for text illumination */}
      <pointLight position={[0, 0, 20]} intensity={1.5} />

      {/* Fog for depth - stars fade into the void */}
      <fog attach="fog" args={['#000000', 40, 120]} />
    </>
  );
}
