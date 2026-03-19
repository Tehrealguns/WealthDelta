import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore } from './scrollStore';

export function CameraRig({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const { camera } = useThree();
  const smoothScroll = useRef(0);
  const smoothPos = useRef(new THREE.Vector3(0, 1.5, 9));

  useFrame((state) => {
    const scroll = scrollStore.progress;
    smoothScroll.current = THREE.MathUtils.lerp(
      smoothScroll.current,
      scroll,
      reducedMotion ? 0.2 : 0.04,
    );

    const s = smoothScroll.current;
    const t = state.clock.elapsedTime;

    const theta = s * Math.PI * 0.6 + (reducedMotion ? 0 : Math.sin(t * 0.05) * 0.08);
    const phi = 1.25 - s * 0.3 + (reducedMotion ? 0 : Math.sin(t * 0.07) * 0.05);
    const radius = 9 - Math.sin(s * Math.PI) * 2;

    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi) + 0.5;
    const z = radius * Math.sin(phi) * Math.cos(theta);

    smoothPos.current.lerp(new THREE.Vector3(x, y, z), reducedMotion ? 0.2 : 0.04);
    camera.position.copy(smoothPos.current);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
