'use client';

import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <>
      <div className="fixed inset-0 z-0 bg-[#050507]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.03)_0%,transparent_40%)]" />
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
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}
