import { ShaderBackground } from '@/components/shader-background';
import { SignupForm } from '@/components/signup-form';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <>
      <ShaderBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/">
              <h1 className="text-4xl font-extrabold tracking-tighter text-white">
                WealthDelta
              </h1>
            </Link>
            <p className="mt-2 text-sm text-white/40">
              Create your Family Office account
            </p>
          </div>
          <SignupForm />
        </div>
      </div>
    </>
  );
}
