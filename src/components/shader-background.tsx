'use client';

import dynamic from 'next/dynamic';

const WebGLShader = dynamic(
  () => import('@/components/ui/web-gl-shader').then((mod) => mod.WebGLShader),
  { ssr: false },
);

export function ShaderBackground() {
  return (
    <div className="fixed inset-0 z-0">
      <WebGLShader />
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}
