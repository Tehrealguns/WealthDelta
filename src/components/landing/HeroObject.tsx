import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore } from './scrollStore';

export function HeroObject({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.LineSegments>(null);
  const outerRef = useRef<THREE.LineSegments>(null);
  const ringsRef = useRef<THREE.Group>(null);

  const coreGeo = useMemo(() => new THREE.TetrahedronGeometry(2, 0), []);
  const shellEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.TetrahedronGeometry(2.1, 0)), []);
  const outerEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.TetrahedronGeometry(3.2, 0)), []);

  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return;

    const t = state.clock.elapsedTime;
    const scroll = scrollStore.progress;

    const breathe = Math.sin(t * 0.4) * 0.06;
    groupRef.current.position.y = breathe;

    groupRef.current.rotation.y = t * 0.12 + scroll * Math.PI * 0.8;
    groupRef.current.rotation.x = Math.sin(t * 0.07) * 0.1 + scroll * 0.3;
    groupRef.current.rotation.z = Math.cos(t * 0.09) * 0.05;

    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + Math.sin(t * 0.5) * 0.08 + scroll * 0.15;
    }

    if (shellRef.current) {
      const mat = shellRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.6 + Math.sin(t * 0.3) * 0.1;
    }

    if (outerRef.current) {
      outerRef.current.rotation.y = -t * 0.06;
      outerRef.current.rotation.z = t * 0.04;
      const expand = 1 + scroll * 0.25 + Math.sin(t * 0.2) * 0.03;
      outerRef.current.scale.setScalar(expand);
      const mat = outerRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.15 + scroll * 0.1;
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.y = t * 0.08;
      ringsRef.current.rotation.x = Math.sin(t * 0.05) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef} geometry={coreGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color="#CA8A04"
          metalness={1}
          roughness={0.15}
          emissive="#CA8A04"
          emissiveIntensity={0.2}
        />
      </mesh>

      <lineSegments ref={shellRef} geometry={shellEdges}>
        <lineBasicMaterial color="#e6be6a" transparent opacity={0.6} />
      </lineSegments>

      <lineSegments ref={outerRef} geometry={outerEdges}>
        <lineBasicMaterial color="#CA8A04" transparent opacity={0.15} />
      </lineSegments>

      <OrbitalRings ref={ringsRef} />
      <VertexBeams />
    </group>
  );
}

import { forwardRef } from 'react';

const OrbitalRings = forwardRef<THREE.Group>(function OrbitalRings(_, ref) {
  const rings = useMemo(
    () => [
      { radius: 4, rotation: [0.3, 0, 0.8] as [number, number, number], opacity: 0.08 },
      { radius: 5.5, rotation: [1.2, 0.5, 0.2] as [number, number, number], opacity: 0.05 },
      { radius: 7, rotation: [0.7, 1.0, 0.4] as [number, number, number], opacity: 0.03 },
    ],
    [],
  );

  return (
    <group ref={ref}>
      {rings.map((ring, i) => (
        <mesh key={i} rotation={ring.rotation}>
          <torusGeometry args={[ring.radius, 0.008, 8, 128]} />
          <meshBasicMaterial color="#CA8A04" transparent opacity={ring.opacity} />
        </mesh>
      ))}
    </group>
  );
});

function VertexBeams() {
  const ref = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    const tetra = new THREE.TetrahedronGeometry(2, 0);
    const pos = tetra.getAttribute('position');
    const verts = new Set<string>();
    const uniqueVerts: THREE.Vector3[] = [];

    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      const key = `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
      if (!verts.has(key)) {
        verts.add(key);
        uniqueVerts.push(v);
      }
    }

    return uniqueVerts.map((v) => {
      const dir = v.clone().normalize();
      const end = dir.multiplyScalar(8);
      const points = [v, end];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      return geo;
    });
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.12;
  });

  return (
    <group ref={ref}>
      {lines.map((geo, i) => (
        <lineSegments key={i} geometry={geo}>
          <lineBasicMaterial
            color="#CA8A04"
            transparent
            opacity={0.04}
          />
        </lineSegments>
      ))}
    </group>
  );
}
