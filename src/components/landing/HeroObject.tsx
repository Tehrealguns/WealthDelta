import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore } from './scrollStore';

export function HeroObject({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.LineSegments>(null);

  const tetraGeo = useMemo(() => new THREE.TetrahedronGeometry(1.8, 0), []);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(tetraGeo), [tetraGeo]);
  const outerTetraGeo = useMemo(() => new THREE.TetrahedronGeometry(2.4, 0), []);
  const outerEdgesGeo = useMemo(() => new THREE.EdgesGeometry(outerTetraGeo), [outerTetraGeo]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const scroll = scrollStore.progress;

    if (reducedMotion) return;

    groupRef.current.rotation.y = t * 0.15 + scroll * Math.PI * 2;
    groupRef.current.rotation.x = Math.sin(t * 0.08) * 0.15;
    groupRef.current.position.y = Math.sin(t * 0.4) * 0.08;

    if (innerRef.current) {
      const mat = innerRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.15 + Math.sin(t * 0.6) * 0.05;
    }

    if (wireRef.current) {
      wireRef.current.rotation.y = -t * 0.08;
      wireRef.current.rotation.z = t * 0.05;
      const scale = 1 + scroll * 0.15;
      wireRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.3, 0]}>
      <mesh ref={innerRef} geometry={tetraGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color="#CA8A04"
          metalness={1}
          roughness={0.18}
          emissive="#CA8A04"
          emissiveIntensity={0.15}
        />
      </mesh>

      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color="#e6be6a" transparent opacity={0.7} />
      </lineSegments>

      <lineSegments ref={wireRef} geometry={outerEdgesGeo}>
        <lineBasicMaterial color="#CA8A04" transparent opacity={0.25} />
      </lineSegments>

      <GlassAccents />
    </group>
  );
}

function GlassAccents() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.1;
  });

  const accents = useMemo(
    () => [
      { pos: [3.2, 0.5, -1] as [number, number, number], scale: 0.15 },
      { pos: [-2.8, -0.8, 1.5] as [number, number, number], scale: 0.12 },
      { pos: [1.5, 2.2, -2] as [number, number, number], scale: 0.1 },
      { pos: [-1.8, 1.8, 2] as [number, number, number], scale: 0.08 },
    ],
    [],
  );

  return (
    <group ref={ref}>
      {accents.map((a, i) => (
        <mesh key={i} position={a.pos}>
          <octahedronGeometry args={[a.scale]} />
          <meshStandardMaterial
            color="#CA8A04"
            metalness={0.9}
            roughness={0.3}
            emissive="#CA8A04"
            emissiveIntensity={0.1}
            transparent
            opacity={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}
