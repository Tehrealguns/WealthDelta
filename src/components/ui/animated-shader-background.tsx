'use client';

import { useEffect, useRef, useState } from 'react';
import { scrollStore } from '@/components/landing/scrollStore';

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function AnimatedShaderBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isWebGLAvailable()) {
      setFailed(true);
      return;
    }

    let THREE: typeof import('three');
    let frameId: number;
    let renderer: import('three').WebGLRenderer;
    let cleanedUp = false;

    (async () => {
      try {
        THREE = await import('three');

        if (cleanedUp) return;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        const material = new THREE.ShaderMaterial({
          uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            iScroll: { value: 0 },
            iMouse: { value: new THREE.Vector2(0, 0) },
          },
          vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform float iTime;
            uniform vec2 iResolution;
            uniform float iScroll;
            uniform vec2 iMouse;

            #define NUM_OCTAVES 3

            float rand(vec2 n) {
              return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
            }

            float noise(vec2 p) {
              vec2 ip = floor(p);
              vec2 u = fract(p);
              u = u * u * (3.0 - 2.0 * u);
              float res = mix(
                mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
                mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
              return res * res;
            }

            float fbm(vec2 x) {
              float v = 0.0;
              float a = 0.3;
              vec2 shift = vec2(100);
              mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
              for (int i = 0; i < NUM_OCTAVES; ++i) {
                v += a * noise(x);
                x = rot * x * 2.0 + shift;
                a *= 0.4;
              }
              return v;
            }

            void main() {
              vec2 shake = vec2(sin(iTime * 0.9) * 0.003, cos(iTime * 1.6) * 0.003);
              vec2 p = ((gl_FragCoord.xy + shake * iResolution.xy) - iResolution.xy * 0.5)
                       / iResolution.y * mat2(6.0, -4.0, 4.0, 6.0);

              p += vec2(iMouse.x * 0.25, iScroll * 4.0 + iMouse.y * 0.2);

              vec2 v;
              vec4 o = vec4(0.0);
              float f = 2.0 + fbm(p + vec2(iTime * 5.0, 0.0)) * 0.5;

              for (float i = 0.0; i < 35.0; i++) {
                v = p + cos(i * i + (iTime + p.x * 0.08) * 0.025 + i * vec2(13.0, 11.0)) * 3.5
                  + vec2(sin(iTime * 3.0 + i) * 0.003, cos(iTime * 3.5 - i) * 0.003);

                float tailNoise = fbm(v + vec2(iTime * 0.5, i)) * 0.3 * (1.0 - (i / 35.0));

                vec4 warmColor = vec4(
                  0.55 + 0.15 * sin(i * 0.12 + iTime * 0.25),
                  0.28 + 0.10 * cos(i * 0.15 + iTime * 0.3),
                  0.04 + 0.03 * sin(i * 0.2  + iTime * 0.15),
                  1.0
                );

                vec4 contrib = warmColor
                  * exp(sin(i * i + iTime * 0.8))
                  / length(max(v, vec2(v.x * f * 0.015, v.y * 1.5)));

                float thin = smoothstep(0.0, 1.0, i / 35.0) * 0.6;
                o += contrib * (1.0 + tailNoise * 0.8) * thin;
              }

              o = tanh(pow(o / 100.0, vec4(1.6)));
              gl_FragColor = o * 0.55;
            }
          `,
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        let smoothScroll = 0;
        let smoothMx = 0;
        let smoothMy = 0;

        const animate = () => {
          material.uniforms.iTime.value += 0.012;

          smoothScroll += (scrollStore.progress - smoothScroll) * 0.04;
          smoothMx += (scrollStore.mouseX - smoothMx) * 0.03;
          smoothMy += (scrollStore.mouseY - smoothMy) * 0.03;

          material.uniforms.iScroll.value = smoothScroll;
          material.uniforms.iMouse.value.set(smoothMx, smoothMy);

          renderer.render(scene, camera);
          frameId = requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
          renderer.setSize(window.innerWidth, window.innerHeight);
          material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        const cleanup = () => {
          cancelAnimationFrame(frameId);
          window.removeEventListener('resize', handleResize);
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
          geometry.dispose();
          material.dispose();
          renderer.dispose();
        };

        (container as any).__webglCleanup = cleanup;
      } catch {
        setFailed(true);
      }
    })();

    return () => {
      cleanedUp = true;
      const cleanup = (container as any).__webglCleanup;
      if (cleanup) cleanup();
    };
  }, []);

  if (failed) {
    return (
      <div className="fixed inset-0 z-0 bg-[#030305]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(202,138,4,0.06)_0%,transparent_60%)]" />
      </div>
    );
  }

  return <div ref={containerRef} className="fixed inset-0 z-0" />;
}
