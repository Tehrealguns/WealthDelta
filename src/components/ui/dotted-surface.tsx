'use client';

import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function DottedSurface({ className, children, ...props }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !isWebGLAvailable()) {
      setFailed(true);
      return;
    }

    let THREE: typeof import('three');
    let animationId = 0;
    let cleanedUp = false;

    (async () => {
      try {
        THREE = await import('three');

        if (cleanedUp || !containerRef.current) return;

        const SEPARATION = 150;
        const AMOUNTX = 40;
        const AMOUNTY = 60;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          60,
          window.innerWidth / window.innerHeight,
          1,
          10000,
        );
        camera.position.set(0, 355, 1220);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);

        containerRef.current.appendChild(renderer.domElement);

        const positions: number[] = [];
        const colors: number[] = [];
        const geometry = new THREE.BufferGeometry();

        for (let ix = 0; ix < AMOUNTX; ix++) {
          for (let iy = 0; iy < AMOUNTY; iy++) {
            const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
            const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
            positions.push(x, 0, z);
            colors.push(0.78, 0.78, 0.78);
          }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: 8,
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        let count = 0;

        const animate = () => {
          animationId = requestAnimationFrame(animate);
          const positionAttribute = geometry.attributes.position;
          const pos = positionAttribute.array as Float32Array;

          let i = 0;
          for (let ix = 0; ix < AMOUNTX; ix++) {
            for (let iy = 0; iy < AMOUNTY; iy++) {
              const index = i * 3;
              pos[index + 1] =
                Math.sin((ix + count) * 0.3) * 50 +
                Math.sin((iy + count) * 0.5) * 50;
              i++;
            }
          }

          positionAttribute.needsUpdate = true;
          renderer.render(scene, camera);
          count += 0.1;
        };

        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);
        animate();

        const cleanup = () => {
          cancelAnimationFrame(animationId);
          window.removeEventListener('resize', handleResize);
          scene.traverse((object) => {
            if (object instanceof THREE.Points) {
              object.geometry.dispose();
              if (Array.isArray(object.material)) {
                object.material.forEach((m) => m.dispose());
              } else {
                object.material.dispose();
              }
            }
          });
          renderer.dispose();
          if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
            containerRef.current.removeChild(renderer.domElement);
          }
        };

        (containerRef.current as any).__webglCleanup = cleanup;
      } catch {
        setFailed(true);
      }
    })();

    return () => {
      cleanedUp = true;
      if (containerRef.current) {
        const cleanup = (containerRef.current as any).__webglCleanup;
        if (cleanup) cleanup();
      }
    };
  }, []);

  if (failed) {
    return (
      <div className={cn('pointer-events-none fixed inset-0 -z-10 bg-[#030305]', className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('pointer-events-none fixed inset-0 -z-10', className)}
      {...props}
    >
      {children}
    </div>
  );
}
