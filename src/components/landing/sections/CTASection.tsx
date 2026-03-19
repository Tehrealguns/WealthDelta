'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ease } from '../animations';

export function CTASection() {
  return (
    <section className="relative py-40 px-6 text-center" style={{ perspective: 1000 }}>
      <motion.div
        className="mx-auto max-w-lg"
        initial={{ opacity: 0, scale: 0.5, rotateX: 20, filter: 'blur(12px)' }}
        whileInView={{ opacity: 1, scale: 1, rotateX: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: '-80px', amount: 0.2 }}
        transition={{ duration: 1.2, ease }}
      >
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white/90 mb-4">
          Five minutes to{' '}
          <span className="bg-gradient-to-r from-[#CA8A04] via-[#e6be6a] to-[#CA8A04] bg-clip-text text-transparent">
            clarity
          </span>
        </h2>
        <p className="text-[13px] text-white/30 mb-10 max-w-sm mx-auto leading-relaxed">
          Upload your first statement. Get your unified portfolio. Start
          receiving daily briefings.
        </p>
        <Link
          href="/signup"
          className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#CA8A04] px-8 py-3.5 text-sm font-medium text-black transition-all hover:bg-[#d4a528] hover:shadow-[0_0_50px_rgba(202,138,4,0.35)]"
        >
          Get Started
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </section>
  );
}
