import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticlesProps {
  count?: number;
  reducedMotion?: boolean;
}

export function Particles({ count = 500, reducedMotion = false }: ParticlesProps) {
  const ref = useRef<THREE.Points>(null);
  const effectiveCount = reducedMotion ? Math.floor(count / 3) : count;

  const positions = useMemo(() => {
    const pos = new Float32Array(effectiveCount * 3);
    for (let i = 0; i < effectiveCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 35;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = Math.random() * -45;
    }
    return pos;
  }, [effectiveCount]);

  const sizes = useMemo(() => {
    const s = new Float32Array(effectiveCount);
    for (let i = 0; i < effectiveCount; i++) {
      s[i] = Math.random() * 0.03 + 0.01;
    }
    return s;
  }, [effectiveCount]);

  useFrame((_, dt) => {
    if (ref.current && !reducedMotion) {
      ref.current.rotation.y += dt * 0.003;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#d4a853"
        transparent
        opacity={0.25}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
