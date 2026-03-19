import { useMemo, useRef } from 'react';
import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraRig } from './Camera';
import { Lights } from './Lights';
import { Particles } from './Particles';
import { HeroObject } from './HeroObject';
import { PostEffects } from './PostEffects';
import { scrollStore } from './scrollStore';

interface SceneProps {
  reducedMotion?: boolean;
  mobile?: boolean;
}

export function Scene({ reducedMotion = false, mobile = false }: SceneProps) {
  const fogRef = useRef<THREE.Fog>(null);

  useFrame(() => {
    if (!fogRef.current) return;
    const s = scrollStore.progress;
    fogRef.current.near = 14 - s * 4;
    fogRef.current.far = 55 - s * 15;
  });

  return (
    <>
      <CameraRig reducedMotion={reducedMotion} />
      <fog ref={fogRef} attach="fog" args={['#030305', 14, 55]} />
      <Lights />
      <DriftingStars mobile={mobile} reducedMotion={reducedMotion} />
      <Particles count={mobile ? 150 : 400} reducedMotion={reducedMotion} />
      <HeroObject reducedMotion={reducedMotion} />
      {!mobile && <GroundGrid />}
      <PostEffects reducedMotion={reducedMotion} mobile={mobile} />
    </>
  );
}

function DriftingStars({ mobile, reducedMotion }: { mobile: boolean; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const smoothMx = useRef(0);
  const smoothMy = useRef(0);

  useFrame((_, dt) => {
    if (!ref.current || reducedMotion) return;
    const scroll = scrollStore.progress;
    smoothMx.current += (scrollStore.mouseX - smoothMx.current) * 0.01;
    smoothMy.current += (scrollStore.mouseY - smoothMy.current) * 0.01;

    ref.current.rotation.y += dt * (0.002 + scroll * 0.004) + smoothMx.current * dt * 0.015;
    ref.current.rotation.x += dt * (0.0008 + scroll * 0.002) + smoothMy.current * dt * 0.008;
  });

  return (
    <group ref={ref}>
      <Stars
        radius={80}
        depth={100}
        count={mobile ? 400 : 1000}
        factor={1.4}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.3}
      />
    </group>
  );
}

function GroundGrid() {
  const ref = useRef<THREE.GridHelper>(null);
  const smoothMx = useRef(0);

  const gridArgs = useMemo(
    () => [50, 50, '#CA8A04', '#CA8A04'] as [number, number, string, string],
    [],
  );

  useFrame((state) => {
    if (!ref.current) return;
    const scroll = scrollStore.progress;
    smoothMx.current += (scrollStore.mouseX - smoothMx.current) * 0.02;
    const mat = ref.current.material as THREE.Material;
    mat.opacity = 0.01 + scroll * 0.025
      + Math.sin(state.clock.elapsedTime * 0.3) * 0.003;
    ref.current.rotation.y = smoothMx.current * 0.05;
  });

  return (
    <gridHelper
      ref={ref}
      args={gridArgs}
      position={[0, -4, 0]}
      material-transparent
      material-opacity={0.01}
      material-depthWrite={false}
    />
  );
}
