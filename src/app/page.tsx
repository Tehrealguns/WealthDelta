'use client';

import dynamic from 'next/dynamic';
import { WebGLErrorBoundary } from '@/components/webgl-fallback';
import { ShaderBackground } from '@/components/shader-background';
import { HeroSection } from '@/components/hero-section';

const LandingScene = dynamic(
  () =>
    import('@/components/landing/LandingScene').then((mod) => mod.LandingScene),
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
      <LandingScene />
    </WebGLErrorBoundary>
  );
}
