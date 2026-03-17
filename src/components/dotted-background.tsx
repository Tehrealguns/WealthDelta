'use client';

import dynamic from 'next/dynamic';

const DottedSurface = dynamic(
  () => import('@/components/ui/dotted-surface').then((mod) => mod.DottedSurface),
  { ssr: false },
);

export function DottedBackground() {
  return (
    <>
      <DottedSurface />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]" />
    </>
  );
}
