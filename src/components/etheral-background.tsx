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
        color="rgba(60, 60, 80, 1)"
        animation={{ scale: 20, speed: 30 }}
        noise={{ opacity: 0.3, scale: 1.5 }}
        sizing="fill"
      />
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
}
