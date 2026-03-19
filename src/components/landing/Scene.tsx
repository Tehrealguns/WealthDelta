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
      <fog attach="fog" args={['#030305', 14, 55]} />
      <Lights />
      <DriftingStars mobile={mobile} reducedMotion={reducedMotion} />
      <Particles count={mobile ? 250 : 700} reducedMotion={reducedMotion} />
      <HeroObject reducedMotion={reducedMotion} />
      {!mobile && <GroundGrid />}
      <PostEffects reducedMotion={reducedMotion} mobile={mobile} />
    </>
  );
}

function DriftingStars({ mobile, reducedMotion }: { mobile: boolean; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!ref.current || reducedMotion) return;
    ref.current.rotation.y += dt * 0.003;
    ref.current.rotation.x += dt * 0.001;
  });

  return (
    <group ref={ref}>
      <Stars
        radius={65}
        depth={90}
        count={mobile ? 600 : 1800}
        factor={2.2}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.6}
      />
    </group>
  );
}

function GroundGrid() {
  const ref = useRef<THREE.GridHelper>(null);

  const gridArgs = useMemo(
    () => [50, 50, '#CA8A04', '#CA8A04'] as [number, number, string, string],
    [],
  );

  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.Material;
    mat.opacity = 0.025 + scrollStore.progress * 0.02 + Math.sin(state.clock.elapsedTime * 0.3) * 0.005;
  });

  return (
    <gridHelper
      ref={ref}
      args={gridArgs}
      position={[0, -4, 0]}
      material-transparent
      material-opacity={0.025}
      material-depthWrite={false}
    />
  );
}
