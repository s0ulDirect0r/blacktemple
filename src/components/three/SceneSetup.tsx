// SceneSetup provides lighting and fog for the 3D scene
// Camera movement is now handled by CameraController

export default function SceneSetup() {
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
