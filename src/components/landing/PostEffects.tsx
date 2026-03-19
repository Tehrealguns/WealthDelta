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
          luminanceThreshold={0.6}
          luminanceSmoothing={0.4}
          intensity={0.8}
          mipmapBlur
        />
        <Vignette offset={0.25} darkness={0.7} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        luminanceThreshold={0.6}
        luminanceSmoothing={0.4}
        intensity={0.8}
        mipmapBlur
      />
      <Vignette offset={0.25} darkness={0.7} />
      <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={0.015}
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0008, 0.0008]}
      />
    </EffectComposer>
  );
}
