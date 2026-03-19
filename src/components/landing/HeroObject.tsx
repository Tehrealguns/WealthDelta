import { useRef, useMemo, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore } from './scrollStore';

export function HeroObject({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.LineSegments>(null);
  const outerRef = useRef<THREE.LineSegments>(null);
  const icoRef = useRef<THREE.LineSegments>(null);
  const octaRef = useRef<THREE.LineSegments>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const smoothMx = useRef(0);
  const smoothMy = useRef(0);

  const coreGeo = useMemo(() => new THREE.TetrahedronGeometry(2, 0), []);
  const shellEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.TetrahedronGeometry(2.1, 0)), []);
  const outerEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.TetrahedronGeometry(3.2, 0)), []);
  const icoEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.6, 0)), []);
  const octaEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.OctahedronGeometry(3.5, 0)), []);

  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return;

    const t = state.clock.elapsedTime;
    const scroll = scrollStore.progress;

    smoothMx.current += (scrollStore.mouseX - smoothMx.current) * 0.04;
    smoothMy.current += (scrollStore.mouseY - smoothMy.current) * 0.04;
    const mx = smoothMx.current;
    const my = smoothMy.current;

    // --- Scroll-phase morphing ---
    // 0.0-0.15  Hero:     pristine tetra, slow spin
    // 0.15-0.35 Problem:  opens up, outer expands
    // 0.35-0.55 Briefing: icosa wireframe fades in, tilts
    // 0.55-0.75 Banks:    octa wireframe appears, complex
    // 0.75-0.90 Security: solidifies, low spin, stable
    // 0.90-1.0  CTA:      peak glow, all layers, dramatic

    const phase = scroll;
    const heroFade = 1 - smoothstep(phase, 0.0, 0.15);
    const openAmount = smoothstep(phase, 0.12, 0.35);
    const icoFade = bell(phase, 0.35, 0.55, 0.12);
    const octaFade = bell(phase, 0.55, 0.80, 0.12);
    const solidify = smoothstep(phase, 0.70, 0.90);
    const ctaGlow = smoothstep(phase, 0.85, 1.0);

    const baseSpeed = 0.1 - solidify * 0.06 + ctaGlow * 0.08;
    groupRef.current.position.y = Math.sin(t * 0.35) * (0.08 + ctaGlow * 0.04);
    groupRef.current.rotation.y = t * baseSpeed + scroll * Math.PI * 0.7 + mx * 0.2;
    groupRef.current.rotation.x = Math.sin(t * 0.06) * 0.12 + scroll * 0.25 + my * 0.15;
    groupRef.current.rotation.z = Math.cos(t * 0.08) * 0.06 + mx * my * 0.05;

    const coreScale = 1 + heroFade * 0.05 - openAmount * 0.1 + solidify * 0.08 + ctaGlow * 0.12;
    groupRef.current.children[0]?.scale.setScalar(coreScale);

    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.18 + Math.sin(t * 0.4) * 0.08
        + scroll * 0.12 + ctaGlow * 0.25;
      mat.roughness = 0.15 + solidify * 0.15 - ctaGlow * 0.1;
    }

    if (shellRef.current) {
      const mat = shellRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.5 + Math.sin(t * 0.25) * 0.12 + ctaGlow * 0.2;
    }

    if (outerRef.current) {
      outerRef.current.rotation.y = -t * 0.05 + mx * 0.1;
      outerRef.current.rotation.z = t * 0.035 + my * 0.08;
      const expand = 1 + openAmount * 0.35 + Math.sin(t * 0.15) * 0.04 + ctaGlow * 0.15;
      outerRef.current.scale.setScalar(expand);
      const mat = outerRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.1 + openAmount * 0.12 + ctaGlow * 0.1;
    }

    if (icoRef.current) {
      icoRef.current.rotation.y = t * 0.04 - mx * 0.05;
      icoRef.current.rotation.x = t * 0.03 + my * 0.05;
      const mat = icoRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = icoFade * 0.2;
      icoRef.current.scale.setScalar(1 + icoFade * 0.1);
    }

    if (octaRef.current) {
      octaRef.current.rotation.y = -t * 0.035 + mx * 0.08;
      octaRef.current.rotation.z = t * 0.025;
      const mat = octaRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = octaFade * 0.15;
      octaRef.current.scale.setScalar(1 + octaFade * 0.08);
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.y = t * 0.06 + mx * 0.05;
      ringsRef.current.rotation.x = Math.sin(t * 0.04) * 0.12 + my * 0.06;
      ringsRef.current.rotation.z = Math.cos(t * 0.03) * 0.06;
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
          emissiveIntensity={0.18}
        />
      </mesh>

      <lineSegments ref={shellRef} geometry={shellEdges}>
        <lineBasicMaterial color="#e6be6a" transparent opacity={0.5} />
      </lineSegments>

      <lineSegments ref={outerRef} geometry={outerEdges}>
        <lineBasicMaterial color="#CA8A04" transparent opacity={0.1} />
      </lineSegments>

      <lineSegments ref={icoRef} geometry={icoEdges}>
        <lineBasicMaterial color="#e6be6a" transparent opacity={0} />
      </lineSegments>

      <lineSegments ref={octaRef} geometry={octaEdges}>
        <lineBasicMaterial color="#CA8A04" transparent opacity={0} />
      </lineSegments>

      <OrbitalRings ref={ringsRef} />
      <VertexBeams />
    </group>
  );
}

function smoothstep(x: number, edge0: number, edge1: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function bell(x: number, center: number, width: number, fade: number): number {
  const start = center - width / 2;
  const end = center + width / 2;
  const fadeIn = smoothstep(x, start - fade, start + fade);
  const fadeOut = 1 - smoothstep(x, end - fade, end + fade);
  return fadeIn * fadeOut;
}

const OrbitalRings = forwardRef<THREE.Group>(function OrbitalRings(_, ref) {
  const innerRef = useRef<THREE.Group>(null);

  const rings = useMemo(
    () => [
      { radius: 4, rotation: [0.3, 0, 0.8] as [number, number, number], opacity: 0.07, speed: 1 },
      { radius: 5.5, rotation: [1.2, 0.5, 0.2] as [number, number, number], opacity: 0.05, speed: -0.7 },
      { radius: 7, rotation: [0.7, 1.0, 0.4] as [number, number, number], opacity: 0.035, speed: 0.5 },
    ],
    [],
  );

  useFrame((state) => {
    if (!innerRef.current) return;
    const children = innerRef.current.children;
    const t = state.clock.elapsedTime;
    const mx = scrollStore.mouseX;
    for (let i = 0; i < children.length; i++) {
      children[i].rotation.z = t * 0.03 * rings[i].speed + mx * 0.03;
    }
  });

  return (
    <group ref={(node) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    }}>
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
      const end = dir.multiplyScalar(9);
      const geo = new THREE.BufferGeometry().setFromPoints([v, end]);
      return geo;
    });
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.1 + scrollStore.mouseX * 0.05;
    ref.current.rotation.x = Math.sin(t * 0.03) * 0.05 + scrollStore.mouseY * 0.03;
  });

  return (
    <group ref={ref}>
      {lines.map((geo, i) => (
        <lineSegments key={i} geometry={geo}>
          <lineBasicMaterial color="#CA8A04" transparent opacity={0.04} />
        </lineSegments>
      ))}
    </group>
  );
}
