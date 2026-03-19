import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { scrollStore } from '../scrollStore';

gsap.registerPlugin(ScrollTrigger);

export function useScrollProgress(
  scrollRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const wrapper = scrollRef.current;
    if (!wrapper) return;

    const prefersReduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lenis = new Lenis({
      wrapper,
      content: wrapper,
      lerp: prefersReduced ? 1 : 0.045,
      smoothWheel: !prefersReduced,
      wheelMultiplier: 0.7,
      touchMultiplier: 1.2,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const lenisRaf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.create({
      scroller: wrapper,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        scrollStore.progress = self.progress;
      },
    });

    return () => {
      gsap.ticker.remove(lenisRaf);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [scrollRef]);
}
