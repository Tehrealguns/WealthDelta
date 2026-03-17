'use client';

import dynamic from 'next/dynamic';
import { LoginForm } from '@/components/login-form';
import Link from 'next/link';

const FallingPattern = dynamic(
  () => import('@/components/ui/falling-pattern').then((mod) => mod.FallingPattern),
  { ssr: false },
);

export default function LoginPage() {
  return (
    <>
      <div className="fixed inset-0 z-0">
        <FallingPattern
          color="rgba(255, 255, 255, 0.15)"
          backgroundColor="#050507"
          duration={120}
          blurIntensity="0.8em"
          density={1}
          className="h-full"
        />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/">
              <h1 className="text-4xl font-extrabold tracking-tighter text-white">
                WealthDelta
              </h1>
            </Link>
            <p className="mt-2 text-sm text-white/40">
              Sign in to your Family Office dashboard
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </>
  );
}
