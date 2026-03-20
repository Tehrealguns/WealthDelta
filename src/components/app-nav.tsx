'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/activity', label: 'Activity' },
  { href: '/briefing', label: 'Briefing' },
  { href: '/vault', label: 'Vault' },
  { href: '/research', label: 'Research' },
  { href: '/connections', label: 'Connections' },
  { href: '/settings', label: 'Settings' },
] as const;

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">WealthDelta</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    active
                      ? 'text-white bg-white/[0.06]'
                      : 'text-white/35 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="hidden sm:inline-flex text-white/40 hover:text-white hover:bg-white/5"
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-white/40 hover:text-white"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.04] bg-[#050505]">
          <nav className="flex flex-col p-4 gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'text-white bg-white/[0.06]'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/[0.03] mt-2 border-t border-white/[0.04] pt-4"
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
