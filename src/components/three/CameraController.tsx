import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useNavigation } from '@/context/NavigationContext';
import {
  ZONES,
  CAMERA_LERP_SPEED,
  ARRIVAL_THRESHOLD,
} from '@/constants/zones';

// Three.js requires direct mutation of camera properties - this is the standard pattern
/* eslint-disable react-hooks/immutability */

export default function CameraController() {
  const { camera } = useThree();
  const {
    targetZone,
    isTransitioning,
    onTransitionComplete,
    prefersReducedMotion,
  } = useNavigation();

  // Track target position and lookAt
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());

  // Update targets when zone changes
  useEffect(() => {
    const zone = ZONES[targetZone];
    targetPosition.current.set(...zone.cameraPos);
    targetLookAt.current.set(...zone.lookAt);

    // If reduced motion, snap immediately
    if (prefersReducedMotion) {
      camera.position.copy(targetPosition.current);
      currentLookAt.current.copy(targetLookAt.current);
      camera.lookAt(currentLookAt.current);
    }
  }, [targetZone, camera, prefersReducedMotion]);

  // Initialize camera on mount
  useEffect(() => {
    const zone = ZONES[targetZone];
    camera.position.set(...zone.cameraPos);
    currentLookAt.current.set(...zone.lookAt);
    camera.lookAt(currentLookAt.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state) => {
    const { pointer } = state;
    const lerpSpeed = CAMERA_LERP_SPEED;

    // Calculate target with parallax offset
    // Parallax is relative to the zone's camera position
    const targetWithParallax = targetPosition.current
      .clone()
      .add(new THREE.Vector3(pointer.x * 0.5, pointer.y * 0.3, 0));

    // Lerp camera position toward target
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      targetWithParallax.x,
      lerpSpeed
    );
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      targetWithParallax.y,
      lerpSpeed
    );
    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      targetWithParallax.z,
      lerpSpeed
    );

    // Lerp lookAt position
    currentLookAt.current.x = THREE.MathUtils.lerp(
      currentLookAt.current.x,
      targetLookAt.current.x,
      lerpSpeed
    );
    currentLookAt.current.y = THREE.MathUtils.lerp(
      currentLookAt.current.y,
      targetLookAt.current.y,
      lerpSpeed
    );
    currentLookAt.current.z = THREE.MathUtils.lerp(
      currentLookAt.current.z,
      targetLookAt.current.z,
      lerpSpeed
    );

    camera.lookAt(currentLookAt.current);

    // Check if transition is complete
    if (isTransitioning) {
      const distanceToTarget = camera.position.distanceTo(
        targetPosition.current
      );
      if (distanceToTarget < ARRIVAL_THRESHOLD) {
        onTransitionComplete();
      }
    }
  });

  return null;
}
