import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore } from './scrollStore';

const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.5, 8),
  new THREE.Vector3(1.2, 0.8, 4),
  new THREE.Vector3(-0.5, 0.3, 0),
  new THREE.Vector3(0.8, -0.2, -6),
  new THREE.Vector3(-0.3, 0.6, -12),
  new THREE.Vector3(0, 0.2, -18),
]);

const lookAtPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 2),
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(0, 0, -5),
  new THREE.Vector3(0, 0, -10),
  new THREE.Vector3(0, 0, -16),
  new THREE.Vector3(0, 0, -22),
]);

export function CameraRig({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const { camera } = useThree();
  const smoothProgress = useRef(0);
  const lookAtTarget = useRef(new THREE.Vector3());

  useFrame(() => {
    const t = scrollStore.progress;
    smoothProgress.current = THREE.MathUtils.lerp(
      smoothProgress.current,
      t,
      reducedMotion ? 0.3 : 0.06,
    );

    const pos = cameraPath.getPoint(smoothProgress.current);
    const look = lookAtPath.getPoint(smoothProgress.current);

    if (reducedMotion) {
      camera.position.set(0, 0.5, THREE.MathUtils.lerp(8, -18, smoothProgress.current));
      camera.lookAt(0, 0, camera.position.z - 5);
    } else {
      camera.position.copy(pos);
      lookAtTarget.current.lerp(look, 0.06);
      camera.lookAt(lookAtTarget.current);
    }
  });

  return null;
}
