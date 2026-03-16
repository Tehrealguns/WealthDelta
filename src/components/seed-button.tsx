'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function SeedButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSeed() {
    setLoading(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const json = await res.json() as { message?: string; error?: string; details?: string };

      if (!res.ok) {
        toast.error(json.details ?? json.error ?? 'Seed failed');
        return;
      }

      toast.success(json.message ?? 'Data seeded');
      router.refresh();
    } catch {
      toast.error('Network error while seeding');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleSeed}
      disabled={loading}
      variant="ghost"
      size="sm"
      className="text-white/40 hover:text-white hover:bg-white/5 border border-white/[0.06]"
    >
      {loading ? 'Seeding...' : 'Seed Mock Data'}
    </Button>
  );
}
