import { AppNav } from '@/components/app-nav';
import { ErrorBoundary } from '@/components/error-boundary';
import { DottedBackground } from '@/components/dotted-background';

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505]">
      <DottedBackground />
      <AppNav />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
