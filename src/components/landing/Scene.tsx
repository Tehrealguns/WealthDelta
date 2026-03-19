import { Stars } from '@react-three/drei';
import { CameraRig } from './Camera';
import { Lights } from './Lights';
import { Particles } from './Particles';
import { HeroObject } from './HeroObject';
import { PostEffects } from './PostEffects';

interface SceneProps {
  reducedMotion?: boolean;
  mobile?: boolean;
}

export function Scene({ reducedMotion = false, mobile = false }: SceneProps) {
  return (
    <>
      <CameraRig reducedMotion={reducedMotion} />
      <fog attach="fog" args={['#030305', 6, 35]} />
      <Lights />
      <Stars
        radius={50}
        depth={60}
        count={mobile ? 800 : 2000}
        factor={2.5}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.3}
      />
      <Particles count={mobile ? 200 : 500} reducedMotion={reducedMotion} />
      <HeroObject reducedMotion={reducedMotion} />
      <PostEffects reducedMotion={reducedMotion} mobile={mobile} />
    </>
  );
}
