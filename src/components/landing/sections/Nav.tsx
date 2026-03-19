'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ease } from '../animations';

export function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-5xl rounded-xl border border-white/[0.06] bg-black/60 backdrop-blur-xl"
    >
      <div className="flex h-12 items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-5 rounded bg-gradient-to-br from-[#CA8A04] to-[#a16c03]" />
          <span className="text-sm font-semibold tracking-tight text-white/90">
            WealthDelta
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="cursor-pointer rounded-lg bg-[#CA8A04] px-4 py-1.5 text-[13px] font-medium text-black transition-colors hover:bg-[#d4a528]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
