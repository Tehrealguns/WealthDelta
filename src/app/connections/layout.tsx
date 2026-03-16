import { AppNav } from '@/components/app-nav';
import { ErrorBoundary } from '@/components/error-boundary';

export default function ConnectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505]">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
