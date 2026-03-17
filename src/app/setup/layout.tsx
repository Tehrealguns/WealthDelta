'use client';

import dynamic from 'next/dynamic';

const Waves = dynamic(
  () => import('@/components/ui/wave-background').then((mod) => mod.Waves),
  { ssr: false },
);

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-0">
        <Waves
          strokeColor="rgba(255, 255, 255, 0.06)"
          backgroundColor="#050507"
        />
      </div>
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        {children}
      </main>
    </>
  );
}
