import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore } from './scrollStore';

interface ParticlesProps {
  count?: number;
  reducedMotion?: boolean;
}

export function Particles({ count = 600, reducedMotion = false }: ParticlesProps) {
  const orbitalRef = useRef<THREE.Points>(null);
  const ambientRef = useRef<THREE.Points>(null);
  const effectiveCount = reducedMotion ? Math.floor(count / 3) : count;
  const orbitalCount = Math.floor(effectiveCount * 0.6);
  const ambientCount = effectiveCount - orbitalCount;

  const orbitalPositions = useMemo(() => {
    const pos = new Float32Array(orbitalCount * 3);
    for (let i = 0; i < orbitalCount; i++) {
      const r = 3 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * 3;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = tilt;
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }
    return pos;
  }, [orbitalCount]);

  const ambientPositions = useMemo(() => {
    const pos = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pos;
  }, [ambientCount]);

  useFrame((_, dt) => {
    if (reducedMotion) return;
    const scroll = scrollStore.progress;

    if (orbitalRef.current) {
      orbitalRef.current.rotation.y += dt * (0.015 + scroll * 0.02);
      orbitalRef.current.rotation.x = Math.sin(scroll * Math.PI) * 0.1;
    }

    if (ambientRef.current) {
      ambientRef.current.rotation.y += dt * 0.002;
    }
  });

  return (
    <>
      <points ref={orbitalRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[orbitalPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color="#d4a853"
          transparent
          opacity={0.35}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <points ref={ambientRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ambientPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.025}
          color="#ffffff"
          transparent
          opacity={0.12}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  );
}
