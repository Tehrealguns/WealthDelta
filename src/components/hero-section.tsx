'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' },
  }),
};

const slideFromLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] } },
};

const slideFromRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const vp = { once: true, margin: '-80px' as const };

export function HeroSection() {
  return (
    <div className="relative z-10">
      {/* Nav */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/20"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-tight text-white/90">WealthDelta</span>
          <div className="flex items-center gap-1">
            <Link
              href="/login"
              className="text-[13px] text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-[13px] text-black font-medium bg-white hover:bg-white/90 transition-colors px-3.5 py-1.5 rounded-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-14">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-semibold tracking-[-0.04em] text-white leading-[1.05] mb-6">
            <motion.span className="block" variants={fadeUp} initial="hidden" animate="visible" custom={0}>
              Every bank.
            </motion.span>
            <motion.span className="block" variants={fadeUp} initial="hidden" animate="visible" custom={1}>
              Every holding.
            </motion.span>
            <motion.span className="block text-white/25" variants={fadeUp} initial="hidden" animate="visible" custom={2}>
              One briefing.
            </motion.span>
          </h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="text-white/35 text-[15px] md:text-base max-w-sm mx-auto leading-relaxed mb-10"
          >
            Upload statements from any bank. Get an AI-generated executive summary in your inbox every morning.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="flex items-center justify-center gap-4"
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors"
            >
              Create Account
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/login"
              className="text-sm text-white/25 hover:text-white/50 transition-colors"
            >
              Sign in
            </Link>
          </motion.div>
        </div>

        <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-8 text-[11px] tracking-wide text-white/15 uppercase">
          {['UBS', 'JBWere', 'Stonehage Fleming', 'Macquarie', 'Bell Potter', 'Morgan Stanley'].map((name, i) => (
            <motion.span
              key={name}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              custom={5 + i}
            >
              {name}
            </motion.span>
          ))}
        </div>
      </section>

      {/* What it does */}
      <section className="py-40 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.p
            variants={slideFromLeft}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            className="text-[13px] text-white/20 tracking-widest uppercase mb-4"
          >
            The problem
          </motion.p>
          <motion.h2
            variants={slideFromLeft}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            className="text-2xl md:text-3xl font-semibold tracking-tight text-white/80 leading-snug max-w-xl mb-20"
          >
            Your wealth is scattered across custodians, currencies, and inboxes. You shouldn&apos;t need a spreadsheet to see the full picture.
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04] rounded-xl overflow-hidden">
            {[
              {
                title: 'Upload once',
                body: 'Drag in your latest statements from any bank. AI reads the PDFs and builds your portfolio automatically.',
              },
              {
                title: 'Stay current',
                body: 'Forward bank emails to your unique vault address. Trades, dividends, and valuations update as they arrive.',
              },
              {
                title: 'Read the summary',
                body: 'Every morning, an executive briefing lands in your inbox. Portfolio delta, risk flags, action items.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={vp}
                custom={i}
                className="bg-black/40 backdrop-blur-sm p-8"
              >
                <h3 className="text-sm font-medium text-white/70 mb-2">{item.title}</h3>
                <p className="text-[13px] text-white/25 leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Briefing preview */}
      <section className="py-40 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid md:grid-cols-5 gap-16 items-start">
            <motion.div
              variants={slideFromLeft}
              initial="hidden"
              whileInView="visible"
              viewport={vp}
              className="md:col-span-2"
            >
              <p className="text-[13px] text-white/20 tracking-widest uppercase mb-4">Daily briefing</p>
              <h2 className="text-2xl font-semibold tracking-tight text-white/80 leading-snug mb-4">
                60 seconds to know everything
              </h2>
              <p className="text-[13px] text-white/25 leading-relaxed mb-6">
                Claude reads your entire portfolio, compares it to yesterday, checks what moved and why, then writes you a briefing. Every single morning.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors"
              >
                Start receiving briefings
                <ArrowRight className="size-3" />
              </Link>
            </motion.div>
            <motion.div
              variants={slideFromRight}
              initial="hidden"
              whileInView="visible"
              viewport={vp}
              className="md:col-span-3 rounded-lg border border-white/[0.06] bg-black/40 backdrop-blur-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                <span className="text-[11px] text-white/25 tracking-widest uppercase">Executive Summary</span>
                <span className="text-[11px] text-white/15 font-mono">6:00 AM</span>
              </div>
              <div className="p-5 space-y-4 text-[13px]">
                {[
                  { color: 'text-emerald-400/70', label: '+$24,350', text: 'Portfolio up 0.31% overnight. BHP rallied 2.1% on iron ore demand data from China.' },
                  { color: 'text-amber-400/70', label: 'WATCH', text: 'UBS rebalancing this week. Expect allocation shifts in equities bucket.' },
                  { color: 'text-blue-400/70', label: 'DIVIDEND', text: 'CBA ex-dividend in 3 days. $4,200 expected distribution to JBWere account.' },
                  { color: 'text-rose-400/70', label: 'RISK', text: 'AUD/USD down 0.8%. USD-denominated holdings gained $12k on FX alone.' },
                ].map((row, i) => (
                  <motion.div
                    key={row.label}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={vp}
                    custom={i}
                    className="flex gap-3"
                  >
                    <span className={`${row.color} font-mono text-[11px] shrink-0 w-16 text-right`}>{row.label}</span>
                    <p className="text-white/40">{row.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Banks & compatibility */}
      <section className="py-40 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={0}
            className="text-[13px] text-white/20 tracking-widest uppercase mb-4"
          >
            Compatibility
          </motion.p>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={0}
            className="text-2xl md:text-3xl font-semibold tracking-tight text-white/80 leading-snug mb-6"
          >
            Works with every bank
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={1}
            className="text-[13px] text-white/25 max-w-md mx-auto leading-relaxed mb-16"
          >
            No API integrations needed. If your bank sends you a PDF statement or an email notification, WealthDelta can read it.
          </motion.p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/[0.04] rounded-xl overflow-hidden mb-16">
            {[
              { name: 'UBS', type: 'Private Bank' },
              { name: 'JBWere', type: 'Wealth Management' },
              { name: 'Stonehage Fleming', type: 'Family Office' },
              { name: 'Macquarie', type: 'Banking & Wrap' },
              { name: 'Bell Potter', type: 'Securities' },
              { name: 'Morgan Stanley', type: 'Wealth Management' },
            ].map((bank, i) => (
              <motion.div
                key={bank.name}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={vp}
                custom={i}
                className="bg-black/40 backdrop-blur-sm p-6 text-center"
              >
                <p className="text-sm font-medium text-white/50 mb-0.5">{bank.name}</p>
                <p className="text-[11px] text-white/15">{bank.type}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={0}
            className="text-[13px] text-white/20"
          >
            Plus CommSec, ANZ, Westpac, NAB, and any bank that sends PDF statements or email notifications.
          </motion.p>
        </div>
      </section>

      {/* Privacy */}
      <section className="py-40 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <motion.div
              variants={slideFromLeft}
              initial="hidden"
              whileInView="visible"
              viewport={vp}
            >
              <p className="text-[13px] text-white/20 tracking-widest uppercase mb-4">Security</p>
              <h2 className="text-2xl font-semibold tracking-tight text-white/80 leading-snug mb-4">
                Your data stays yours
              </h2>
              <p className="text-[13px] text-white/25 leading-relaxed">
                No bank credentials are stored. Personally identifiable information is masked before AI processing. Row-level security isolates every account. There is nothing to breach.
              </p>
            </motion.div>
            <div className="space-y-px rounded-xl overflow-hidden">
              {[
                { label: 'Bank credentials stored', value: 'Zero' },
                { label: 'Third-party data sharing', value: 'None' },
                { label: 'PII sent to AI', value: 'Masked' },
                { label: 'Data isolation', value: 'Row-level' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={vp}
                  custom={i}
                  className="flex items-center justify-between bg-black/40 backdrop-blur-sm px-6 py-4"
                >
                  <span className="text-[13px] text-white/25">{item.label}</span>
                  <span className="text-[13px] font-medium text-white/60">{item.value}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 px-6">
        <div className="mx-auto max-w-xl text-center">
          <motion.h2
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={0}
            className="text-3xl md:text-4xl font-semibold tracking-tight text-white/90 mb-4"
          >
            Five minutes to clarity
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={1}
            className="text-[13px] text-white/25 mb-10 max-w-sm mx-auto leading-relaxed"
          >
            Upload your first statement. Get your unified portfolio. Start receiving daily briefings.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={2}
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-6 py-3 rounded-md hover:bg-white/90 transition-colors"
            >
              Get Started
              <ArrowRight className="size-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={vp}
        custom={0}
        className="border-t border-white/[0.04] py-8 px-6"
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="text-[11px] text-white/15">WealthDelta</span>
          <div className="flex items-center gap-4 text-[11px] text-white/15">
            <Link href="/login" className="hover:text-white/30 transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-white/30 transition-colors">Sign Up</Link>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
