'use client';

import Link from 'next/link';
import { ArrowRight, Upload, Mail, FileText } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const },
  }),
};

const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } },
};

const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease },
  }),
};

const vp = { once: true, margin: '-80px' as `${number}px` };

export function HeroSection() {
  return (
    <div className="relative z-10">
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

      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-14">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#CA8A04]/20 bg-[#CA8A04]/5 px-4 py-1.5"
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

          <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-semibold tracking-[-0.04em] leading-[1.05] mb-6">
            <motion.span className="block text-white/90" variants={fadeUp} initial="hidden" animate="visible" custom={1}>
              Every bank.
            </motion.span>
            <motion.span className="block text-white/90" variants={fadeUp} initial="hidden" animate="visible" custom={2}>
              Every holding.
            </motion.span>
            <motion.span
              className="block bg-gradient-to-r from-[#CA8A04] via-[#e6be6a] to-[#CA8A04] bg-clip-text text-transparent"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
            >
              One briefing.
            </motion.span>
          </h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="text-white/35 text-[15px] max-w-md mx-auto leading-relaxed mb-10"
          >
            Upload statements from any private bank. Get an AI-generated
            executive summary in your inbox every morning.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={5}
            className="flex items-center justify-center gap-4"
          >
            <Link
              href="/signup"
              className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#CA8A04] px-6 py-3 text-sm font-medium text-black transition-all hover:bg-[#d4a528] hover:shadow-[0_0_30px_rgba(202,138,4,0.25)]"
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
        </div>

        <div className="absolute bottom-12 left-0 right-0 flex flex-wrap items-center justify-center gap-8 text-[11px] tracking-widest text-white/[0.08] uppercase">
          {['UBS', 'JBWere', 'Stonehage Fleming', 'Macquarie', 'Bell Potter', 'Morgan Stanley'].map((name, i) => (
            <motion.span key={name} variants={fadeIn} initial="hidden" animate="visible" custom={6 + i}>
              {name}
            </motion.span>
          ))}
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="mx-auto max-w-3xl">
          <motion.p
            className="text-[11px] text-[#CA8A04]/40 tracking-widest uppercase mb-4 font-medium"
            variants={slideFromLeft}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
          >
            How it works
          </motion.p>
          <motion.h2
            variants={slideFromLeft}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            className="text-2xl md:text-3xl font-semibold tracking-tight text-white/80 leading-snug max-w-xl mb-14"
          >
            Your wealth is scattered across custodians, currencies, and inboxes.
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Upload, title: 'Upload once', body: 'Drag in statements from any bank. AI reads the PDFs and builds your portfolio automatically.' },
              { icon: Mail, title: 'Stay current', body: 'Forward bank emails to your vault address. Holdings update as they arrive.' },
              { icon: FileText, title: 'Read the summary', body: 'Every morning, a briefing lands in your inbox. Portfolio delta, risk flags, action items.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={vp}
                custom={i}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-sm"
              >
                <div className="mb-4 inline-flex rounded-lg border border-[#CA8A04]/15 bg-[#CA8A04]/5 p-2.5">
                  <item.icon className="size-4 text-[#CA8A04]/70" />
                </div>
                <h3 className="text-sm font-medium text-white/65 mb-2">{item.title}</h3>
                <p className="text-[13px] text-white/25 leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="mx-auto max-w-4xl flex flex-col md:flex-row gap-12 items-start">
          <motion.div
            variants={slideFromLeft}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            className="flex-1 max-w-sm"
          >
            <p className="text-[11px] text-[#CA8A04]/40 tracking-widest uppercase mb-4 font-medium">Daily briefing</p>
            <h2 className="text-2xl font-semibold tracking-tight text-white/80 leading-snug mb-4">
              60 seconds to know everything
            </h2>
            <p className="text-[13px] text-white/30 leading-relaxed mb-6">
              Claude reads your entire portfolio, compares it to yesterday, checks what moved and why, then writes you a briefing.
            </p>
            <Link
              href="/signup"
              className="group inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-[#CA8A04]/60 transition-colors hover:text-[#CA8A04]"
            >
              Start receiving briefings
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <motion.div
            variants={slideFromRight}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            className="flex-1 w-full max-w-md overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] shadow-[0_0_40px_rgba(202,138,4,0.04)] backdrop-blur-sm"
          >
            <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-[#CA8A04]/50" />
                <span className="text-[11px] tracking-widest text-white/25 uppercase">Executive Summary</span>
              </div>
              <span className="text-[11px] font-mono text-white/10">6:00 AM</span>
            </div>
            <div className="space-y-4 p-5 text-[13px]">
              {[
                { color: 'text-emerald-400/70', label: '+$24,350', text: 'Portfolio up 0.31% overnight. BHP rallied 2.1% on iron ore demand.' },
                { color: 'text-amber-400/70', label: 'WATCH', text: 'UBS rebalancing this week. Equity allocation shifting.' },
                { color: 'text-blue-400/70', label: 'DIVIDEND', text: 'CBA ex-dividend in 3 days. $4,200 to JBWere account.' },
                { color: 'text-rose-400/70', label: 'RISK', text: 'AUD/USD down 0.8%. USD holdings gained $12k on FX alone.' },
              ].map((row) => (
                <div key={row.label} className="flex gap-3">
                  <span className={`${row.color} w-16 shrink-0 text-right font-mono text-[11px]`}>{row.label}</span>
                  <p className="text-white/35">{row.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            className="text-[11px] text-[#CA8A04]/40 tracking-widest uppercase mb-4 font-medium"
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={0}
          >
            Compatibility
          </motion.p>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={0}
            className="text-2xl md:text-3xl font-semibold tracking-tight text-white/80 mb-3"
          >
            Works with every bank
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={1}
            className="text-[13px] text-white/25 max-w-md mx-auto leading-relaxed mb-14"
          >
            No API integrations needed. If your bank sends a PDF or email, WealthDelta can read it.
          </motion.p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                className="group cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm transition-colors hover:border-[#CA8A04]/15"
              >
                <p className="text-sm font-medium text-white/50 transition-colors group-hover:text-white/70">{bank.name}</p>
                <p className="text-[11px] text-white/15 transition-colors group-hover:text-white/25">{bank.type}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="mx-auto max-w-4xl flex flex-col md:flex-row gap-12 items-start">
          <motion.div
            variants={slideFromLeft}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            className="flex-1 max-w-sm"
          >
            <p className="text-[11px] text-[#CA8A04]/40 tracking-widest uppercase mb-4 font-medium">Security</p>
            <h2 className="text-2xl font-semibold tracking-tight text-white/80 leading-snug mb-4">
              Your data stays yours
            </h2>
            <p className="text-[13px] text-white/30 leading-relaxed">
              No bank credentials stored. PII masked before AI processing. Row-level security isolates every account.
            </p>
          </motion.div>
          <div className="flex-1 w-full max-w-md space-y-3">
            {[
              { label: 'Bank credentials stored', value: 'Zero', accent: true },
              { label: 'Third-party data sharing', value: 'None', accent: false },
              { label: 'PII sent to AI', value: 'Masked', accent: true },
              { label: 'Data isolation', value: 'Row-level', accent: true },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={vp}
                custom={i}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 backdrop-blur-sm"
              >
                <span className="text-[13px] text-white/25">{item.label}</span>
                <span className={`font-mono text-sm font-medium ${item.accent ? 'text-[#CA8A04]/70' : 'text-white/55'}`}>
                  {item.value}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="mx-auto max-w-xl text-center">
          <motion.h2
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={0}
            className="text-3xl md:text-4xl font-semibold tracking-tight text-white/90 mb-4"
          >
            Five minutes to{' '}
            <span className="bg-gradient-to-r from-[#CA8A04] via-[#e6be6a] to-[#CA8A04] bg-clip-text text-transparent">
              clarity
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            custom={1}
            className="text-[13px] text-white/30 mb-10 max-w-sm mx-auto leading-relaxed"
          >
            Upload your first statement. Get your unified portfolio. Start receiving daily briefings.
          </motion.p>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={vp} custom={2}>
            <Link
              href="/signup"
              className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#CA8A04] px-8 py-3.5 text-sm font-medium text-black transition-all hover:bg-[#d4a528] hover:shadow-[0_0_40px_rgba(202,138,4,0.3)]"
            >
              Get Started
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <motion.footer
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={vp}
        custom={0}
        className="border-t border-white/[0.04] py-8 px-6"
      >
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-4 rounded bg-gradient-to-br from-[#CA8A04] to-[#a16c03]" />
            <span className="text-[11px] text-white/15">&copy; {new Date().getFullYear()} WealthDelta</span>
          </div>
          <div className="flex items-center gap-6 text-[11px] text-white/15">
            <Link href="/login" className="cursor-pointer transition-colors hover:text-white/40">Sign In</Link>
            <Link href="/signup" className="cursor-pointer transition-colors hover:text-white/40">Get Started</Link>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
