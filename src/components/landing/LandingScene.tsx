'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import * as THREE from 'three';
import { Scene } from './Scene';
import { useScrollProgress } from './hooks/useScrollProgress';
import { Nav } from './sections/Nav';
import { HeroSection } from './sections/HeroSection';
import { ProblemSection } from './sections/ProblemSection';
import { BriefingSection } from './sections/BriefingSection';
import { BanksSection } from './sections/BanksSection';
import { SecuritySection } from './sections/SecuritySection';
import { CTASection } from './sections/CTASection';
import { FooterSection } from './sections/FooterSection';

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030305]">
      <div className="flex flex-col items-center gap-4">
        <div className="size-6 rounded bg-gradient-to-br from-[#CA8A04] to-[#a16c03] animate-pulse" />
        <span className="text-xs text-white/20 tracking-widest uppercase">
          Loading
        </span>
      </div>
    </div>
  );
}

export function LandingScene() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    setMobile(window.innerWidth < 768);

    const handleResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useScrollProgress(scrollRef);

  if (!mounted) return <LoadingScreen />;

  return (
    <div className="relative h-screen w-screen bg-[#030305]">
      <Canvas
        camera={{ position: [0, 0.5, 8], fov: 50, near: 0.1, far: 80 }}
        style={{ position: 'fixed', inset: 0, zIndex: 0 }}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#030305']} />
        <Suspense fallback={null}>
          <Scene reducedMotion={reducedMotion} mobile={mobile} />
          <Preload all />
        </Suspense>
      </Canvas>

      <div ref={scrollRef} className="relative z-10 h-screen overflow-y-auto">
        <Nav />
        <HeroSection />
        <ProblemSection />
        <BriefingSection />
        <BanksSection />
        <SecuritySection />
        <CTASection />
        <FooterSection />
      </div>
    </div>
  );
}
