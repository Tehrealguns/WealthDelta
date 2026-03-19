import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore } from './scrollStore';

const _targetPos = new THREE.Vector3();

export function CameraRig({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const { camera } = useThree();
  const smoothScroll = useRef(0);

  useFrame((state) => {
    const scroll = scrollStore.progress;

    smoothScroll.current += (scroll - smoothScroll.current) * (reducedMotion ? 0.15 : 0.025);

    const s = smoothScroll.current;
    const t = state.clock.elapsedTime;

    const drift = reducedMotion ? 0 : 1;
    const theta = s * Math.PI * 0.55 + Math.sin(t * 0.04) * 0.06 * drift;
    const phi = 1.25 - s * 0.25 + Math.sin(t * 0.055) * 0.04 * drift;
    const radius = 9 - Math.sin(s * Math.PI) * 1.8;

    _targetPos.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi) + 0.5,
      radius * Math.sin(phi) * Math.cos(theta),
    );

    camera.position.lerp(_targetPos, reducedMotion ? 0.15 : 0.025);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
