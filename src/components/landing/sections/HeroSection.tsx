'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp, fadeIn } from '../animations';

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100vh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#CA8A04]/20 bg-[#CA8A04]/[0.06] px-4 py-1.5 backdrop-blur-md"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="size-1.5 rounded-full bg-[#CA8A04] animate-pulse" />
        <span className="text-[11px] font-medium tracking-wide text-[#CA8A04]/80">
          AI-Powered Portfolio Intelligence
        </span>
      </motion.div>

      <motion.h1
        className="text-[clamp(2.8rem,8vw,5.5rem)] font-semibold tracking-[-0.04em] leading-[1.05]"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <span className="text-white/90">Every bank.</span>
        <br />
        <span className="text-white/90">Every holding.</span>
        <br />
        <span className="bg-gradient-to-r from-[#CA8A04] via-[#e6be6a] to-[#CA8A04] bg-clip-text text-transparent">
          One briefing.
        </span>
      </motion.h1>

      <motion.p
        className="mt-6 max-w-md text-[15px] text-white/30 leading-relaxed"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={3}
      >
        Upload statements from any private bank. Get an AI-generated executive
        summary in your inbox every morning.
      </motion.p>

      <motion.div
        className="mt-8 flex items-center gap-4"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={4}
      >
        <Link
          href="/signup"
          className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#CA8A04] px-6 py-3 text-sm font-medium text-black transition-all hover:bg-[#d4a528] hover:shadow-[0_0_30px_rgba(202,138,4,0.3)]"
        >
          Create Account
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/login"
          className="cursor-pointer text-sm text-white/25 transition-colors hover:text-white/50"
        >
          Sign in
        </Link>
      </motion.div>

      <motion.div
        className="mt-24 flex flex-wrap items-center justify-center gap-8 text-[11px] tracking-widest text-white/[0.06] uppercase"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        custom={6}
      >
        {['UBS', 'JBWere', 'Stonehage Fleming', 'Macquarie', 'Bell Potter', 'Morgan Stanley'].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 1, repeat: Infinity, repeatType: 'reverse' }}
      >
        <div className="size-5 rounded-full border border-white/[0.08] flex items-center justify-center">
          <div className="size-1 rounded-full bg-white/20" />
        </div>
      </motion.div>
    </section>
  );
}
