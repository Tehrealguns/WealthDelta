'use client';

import dynamic from 'next/dynamic';
import { WebGLErrorBoundary } from '@/components/webgl-fallback';
import { ShaderBackground } from '@/components/shader-background';
import { HeroSection } from '@/components/hero-section';

const LandingScene3D = dynamic(
  () => import('@/components/landing-scene-3d').then((mod) => mod.LandingScene3D),
  { ssr: false },
);

function FlatFallback() {
  return (
    <>
      <ShaderBackground />
      <HeroSection />
    </>
  );
}

export default function Home() {
  return (
    <WebGLErrorBoundary fallback={<FlatFallback />}>
      <LandingScene3D />
    </WebGLErrorBoundary>
  );
}
