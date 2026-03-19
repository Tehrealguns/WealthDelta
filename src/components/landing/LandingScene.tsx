'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatedShaderBackground } from '@/components/ui/animated-shader-background';
import { scrollStore } from './scrollStore';
import { useScrollProgress } from './hooks/useScrollProgress';
import { Nav } from './sections/Nav';
import { HeroSection } from './sections/HeroSection';
import { ProblemSection } from './sections/ProblemSection';
import { BriefingSection } from './sections/BriefingSection';
import { BanksSection } from './sections/BanksSection';
import { SecuritySection } from './sections/SecuritySection';
import { CTASection } from './sections/CTASection';
import { FooterSection } from './sections/FooterSection';

export function LandingScene() {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    scrollStore.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    scrollStore.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  useEffect(() => {
    setMounted(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  useScrollProgress(scrollEl);

  if (!mounted) return null;

  return (
    <div className="relative h-screen w-screen bg-[#030305]">
      <AnimatedShaderBackground />

      <div
        ref={setScrollEl}
        className="relative z-10 h-screen overflow-y-auto"
      >
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
