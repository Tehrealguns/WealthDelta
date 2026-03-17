import { RetroGrid } from '@/components/ui/retro-grid';

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-0 bg-black">
        <RetroGrid angle={65} />
      </div>
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        {children}
      </main>
    </>
  );
}
