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
  return (
    <>
      <CameraRig reducedMotion={reducedMotion} />
      <fog attach="fog" args={['#030305', 12, 50]} />
      <Lights />
      <Stars
        radius={60}
        depth={80}
        count={mobile ? 600 : 1500}
        factor={2}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.2}
      />
      <Particles count={mobile ? 200 : 600} reducedMotion={reducedMotion} />
      <HeroObject reducedMotion={reducedMotion} />
      {!mobile && <GroundGrid />}
      <PostEffects reducedMotion={reducedMotion} mobile={mobile} />
    </>
  );
}

function GroundGrid() {
  const ref = useRef<THREE.GridHelper>(null);

  const gridArgs = useMemo(
    () => [40, 40, '#CA8A04', '#CA8A04'] as [number, number, string, string],
    [],
  );

  useFrame(() => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.Material;
    mat.opacity = 0.03 + scrollStore.progress * 0.02;
  });

  return (
    <gridHelper
      ref={ref}
      args={gridArgs}
      position={[0, -4, 0]}
      material-transparent
      material-opacity={0.03}
      material-depthWrite={false}
    />
  );
}
