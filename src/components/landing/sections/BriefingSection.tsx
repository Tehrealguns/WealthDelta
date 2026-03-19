'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { slideLeft, slideRight, vp } from '../animations';

const rows = [
  {
    color: 'text-emerald-400/80',
    label: '+$24,350',
    text: 'Portfolio up 0.31% overnight. BHP rallied 2.1% on iron ore demand.',
  },
  {
    color: 'text-amber-400/80',
    label: 'WATCH',
    text: 'UBS rebalancing this week. Equity allocation shifting.',
  },
  {
    color: 'text-blue-400/80',
    label: 'DIVIDEND',
    text: 'CBA ex-dividend in 3 days. $4,200 to JBWere account.',
  },
  {
    color: 'text-rose-400/80',
    label: 'RISK',
    text: 'AUD/USD down 0.8%. USD holdings gained $12k on FX alone.',
  },
];

export function BriefingSection() {
  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-4xl flex flex-col md:flex-row gap-12 items-start" style={{ perspective: 1000 }}>
        <motion.div
          className="flex-1 max-w-sm"
          variants={slideLeft}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
        >
          <p className="text-[11px] text-[#CA8A04]/50 tracking-widest uppercase mb-4 font-medium">
            Daily briefing
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-white/85 leading-snug mb-4">
            60 seconds to know everything
          </h2>
          <p className="text-[13px] text-white/30 leading-relaxed mb-6">
            Claude reads your entire portfolio, compares it to yesterday, checks
            what moved and why, then writes you a briefing.
          </p>
          <Link
            href="/signup"
            className="group inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-[#CA8A04]/70 transition-colors hover:text-[#CA8A04]"
          >
            Start receiving briefings
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <motion.div
          className="flex-1 w-full max-w-md overflow-hidden rounded-xl border border-white/[0.08] bg-black/50 shadow-[0_0_60px_rgba(202,138,4,0.06)] backdrop-blur-xl"
          variants={slideRight}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-[#CA8A04]/60" />
              <span className="text-[11px] tracking-widest text-white/30 uppercase">
                Executive Summary
              </span>
            </div>
            <span className="text-[11px] font-mono text-white/15">6:00 AM</span>
          </div>
          <div className="space-y-4 p-5 text-[13px]">
            {rows.map((row) => (
              <div key={row.label} className="flex gap-3">
                <span className={`${row.color} w-16 shrink-0 text-right font-mono text-[11px]`}>
                  {row.label}
                </span>
                <p className="text-white/40">{row.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
