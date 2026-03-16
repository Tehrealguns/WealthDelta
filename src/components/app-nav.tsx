'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function AppNav() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">WealthDelta</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-white/40 transition-colors hover:text-white">
              Dashboard
            </Link>
            <Link href="/vault" className="text-white/40 transition-colors hover:text-white">
              Vault
            </Link>
            <Link href="/briefing" className="text-white/40 transition-colors hover:text-white">
              Briefing
            </Link>
            <Link href="/research" className="text-white/40 transition-colors hover:text-white">
              Research
            </Link>
            <Link href="/connections" className="text-white/40 transition-colors hover:text-white">
              Connections
            </Link>
          </nav>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white/40 hover:text-white hover:bg-white/5">
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </header>
  );
}
