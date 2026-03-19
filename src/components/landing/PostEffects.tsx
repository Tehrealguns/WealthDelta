import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

interface PostEffectsProps {
  reducedMotion?: boolean;
  mobile?: boolean;
}

export function PostEffects({ reducedMotion = false, mobile = false }: PostEffectsProps) {
  if (reducedMotion) return null;

  if (mobile) {
    return (
      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0.4}
          luminanceSmoothing={0.5}
          intensity={1.2}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={0.8} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        luminanceThreshold={0.3}
        luminanceSmoothing={0.5}
        intensity={1.4}
        mipmapBlur
      />
      <Vignette offset={0.3} darkness={0.75} />
      <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={0.012}
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0006, 0.0006]}
      />
    </EffectComposer>
  );
}
