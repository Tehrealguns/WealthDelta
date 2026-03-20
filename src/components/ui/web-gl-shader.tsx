'use client';

import { useEffect, useRef, useState } from 'react';

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !isWebGLAvailable()) {
      setFailed(true);
      return;
    }

    let THREE: typeof import('three');
    let animationId: number | null = null;
    let cleanedUp = false;

    (async () => {
      try {
        THREE = await import('three');

        if (cleanedUp || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({ canvas });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(new THREE.Color(0x000000));

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1);

        const uniforms = {
          resolution: { value: [window.innerWidth, window.innerHeight] },
          time: { value: 0.0 },
          xScale: { value: 1.0 },
          yScale: { value: 0.5 },
          distortion: { value: 0.05 },
        };

        const position = [
          -1.0, -1.0, 0.0,
           1.0, -1.0, 0.0,
          -1.0,  1.0, 0.0,
           1.0, -1.0, 0.0,
          -1.0,  1.0, 0.0,
           1.0,  1.0, 0.0,
        ];

        const positions = new THREE.BufferAttribute(new Float32Array(position), 3);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', positions);

        const material = new THREE.RawShaderMaterial({
          vertexShader: `
            attribute vec3 position;
            void main() {
              gl_Position = vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision highp float;
            uniform vec2 resolution;
            uniform float time;
            uniform float xScale;
            uniform float yScale;
            uniform float distortion;

            void main() {
              vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
              float d = length(p) * distortion;
              float rx = p.x * (1.0 + d);
              float gx = p.x;
              float bx = p.x * (1.0 - d);
              float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
              float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
              float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
              gl_FragColor = vec4(r, g, b, 1.0);
            }
          `,
          uniforms,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const handleResize = () => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          renderer.setSize(width, height, false);
          uniforms.resolution.value = [width, height];
        };
        handleResize();

        const animate = () => {
          uniforms.time.value += 0.01;
          renderer.render(scene, camera);
          animationId = requestAnimationFrame(animate);
        };
        animate();

        window.addEventListener('resize', handleResize);

        const cleanup = () => {
          if (animationId) cancelAnimationFrame(animationId);
          window.removeEventListener('resize', handleResize);
          scene.remove(mesh);
          geometry.dispose();
          material.dispose();
          renderer.dispose();
        };

        (canvas as any).__webglCleanup = cleanup;
      } catch {
        setFailed(true);
      }
    })();

    return () => {
      cleanedUp = true;
      if (canvasRef.current) {
        const cleanup = (canvasRef.current as any).__webglCleanup;
        if (cleanup) cleanup();
      }
    };
  }, []);

  if (failed) {
    return <div className="fixed top-0 left-0 w-full h-full bg-[#030305]" />;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full block"
    />
  );
}
