import { EtheralBackground } from '@/components/etheral-background';

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EtheralBackground />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        {children}
      </main>
    </>
  );
}
