'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback?next=/onboard`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  async function handleResend() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback?next=/onboard`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Confirmation email resent');
    }
  }

  if (sent) {
    return (
      <Card className="border-white/10 bg-white/[0.06] backdrop-blur-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white">Check your email</h2>
          <p className="text-sm text-white/50 max-w-xs mx-auto">
            We sent a confirmation link to <span className="text-white/60">{email}</span>. Click it to activate your account.
          </p>
          <p className="text-xs text-white/30">
            It can take a minute to arrive. Check spam if you don't see it.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={loading}
              className="text-white/40 hover:text-white hover:bg-white/5"
            >
              {loading ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
              Resend Email
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/login')}
              className="text-white/30 hover:text-white hover:bg-white/5"
            >
              Go to Sign In
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-white/[0.06] backdrop-blur-2xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-white/60">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/30 focus:border-white/25"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-white/60">
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
              className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/30 focus:border-white/25"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm text-white/60">
              Confirm Password
            </label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/30 focus:border-white/25"
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
        <div className="mt-5 text-center">
          <p className="text-sm text-white/40">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-white/50 hover:text-white transition-colors underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
