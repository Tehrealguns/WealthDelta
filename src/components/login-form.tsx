'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success('Signed in successfully');
    router.push('/dashboard');
    router.refresh();
    setLoading(false);
  }

  return (
    <Card className="border-white/[0.06] bg-black/40 backdrop-blur-2xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-white/50">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-white/[0.06] bg-white/[0.03] text-white placeholder:text-white/20 focus:border-white/20"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-white/50">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="border-white/[0.06] bg-white/[0.03] text-white placeholder:text-white/20 focus:border-white/20"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black hover:bg-white/90 font-medium h-11"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
        <div className="mt-5 text-center">
          <p className="text-sm text-white/30">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-white/50 hover:text-white transition-colors underline underline-offset-2"
            >
              Create one
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
