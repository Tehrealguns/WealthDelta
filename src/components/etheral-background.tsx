'use client';

import dynamic from 'next/dynamic';

const EtheralShadow = dynamic(
  () => import('@/components/ui/etheral-shadow').then((mod) => mod.EtheralShadow),
  { ssr: false },
);

export function EtheralBackground() {
  return (
    <div className="fixed inset-0 z-0">
      <EtheralShadow
        color="rgba(80, 80, 100, 1)"
        animation={{ scale: 70, speed: 60 }}
        noise={{ opacity: 0.6, scale: 1.2 }}
        sizing="fill"
      />
      <div className="absolute inset-0 bg-black/70" />
    </div>
  );
}
