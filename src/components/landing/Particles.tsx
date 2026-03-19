import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore } from './scrollStore';

interface ParticlesProps {
  count?: number;
  reducedMotion?: boolean;
}

export function Particles({ count = 400, reducedMotion = false }: ParticlesProps) {
  const orbitalRef = useRef<THREE.Points>(null);
  const ambientRef = useRef<THREE.Points>(null);
  const driftRef = useRef<THREE.Points>(null);
  const smoothMx = useRef(0);
  const smoothMy = useRef(0);

  const effectiveCount = reducedMotion ? Math.floor(count / 3) : count;
  const orbitalCount = Math.floor(effectiveCount * 0.5);
  const ambientCount = Math.floor(effectiveCount * 0.3);
  const driftCount = effectiveCount - orbitalCount - ambientCount;

  const orbitalPositions = useMemo(() => {
    const pos = new Float32Array(orbitalCount * 3);
    for (let i = 0; i < orbitalCount; i++) {
      const r = 3.5 + Math.random() * 7;
      const angle = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * 2.5;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = tilt;
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }
    return pos;
  }, [orbitalCount]);

  const ambientPositions = useMemo(() => {
    const pos = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, [ambientCount]);

  const driftPositions = useMemo(() => {
    const pos = new Float32Array(driftCount * 3);
    for (let i = 0; i < driftCount; i++) {
      const r = 5 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [driftCount]);

  useFrame((state, dt) => {
    if (reducedMotion) return;
    const scroll = scrollStore.progress;
    const t = state.clock.elapsedTime;

    smoothMx.current += (scrollStore.mouseX - smoothMx.current) * 0.02;
    smoothMy.current += (scrollStore.mouseY - smoothMy.current) * 0.02;
    const mx = smoothMx.current;
    const my = smoothMy.current;

    if (orbitalRef.current) {
      orbitalRef.current.rotation.y += dt * (0.02 + scroll * 0.04);
      orbitalRef.current.rotation.x = Math.sin(t * 0.03) * 0.08 + my * 0.08;
      orbitalRef.current.rotation.z = Math.cos(t * 0.02) * 0.04 + mx * 0.06;
      const mat = orbitalRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.08 + scroll * 0.12;
    }

    if (ambientRef.current) {
      ambientRef.current.rotation.y += dt * (0.004 + scroll * 0.003);
      ambientRef.current.rotation.x += dt * 0.001;
      ambientRef.current.position.x = mx * 0.5;
      ambientRef.current.position.y = my * 0.3;
    }

    if (driftRef.current) {
      driftRef.current.rotation.y -= dt * (0.008 + scroll * 0.006);
      driftRef.current.rotation.z += dt * 0.003;
      driftRef.current.position.x = mx * 0.3;
      driftRef.current.position.y = my * 0.2;
      const mat = driftRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.04 + scroll * 0.06;
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
          opacity={0.08}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <points ref={ambientRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ambientPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.015}
          color="#ffffff"
          transparent
          opacity={0.04}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <points ref={driftRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[driftPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.025}
          color="#CA8A04"
          transparent
          opacity={0.04}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  );
}
