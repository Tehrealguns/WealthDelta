'use client';

import { motion } from 'framer-motion';
import { fadeUp, cardMorph, vp } from '../animations';

const banks = [
  { name: 'UBS', type: 'Private Bank' },
  { name: 'JBWere', type: 'Wealth Management' },
  { name: 'Stonehage Fleming', type: 'Family Office' },
  { name: 'Macquarie', type: 'Banking & Wrap' },
  { name: 'Bell Potter', type: 'Securities' },
  { name: 'Morgan Stanley', type: 'Wealth Management' },
];

export function BanksSection() {
  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <motion.p
          className="text-[11px] text-[#CA8A04]/50 tracking-widest uppercase mb-4 font-medium"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          custom={0}
        >
          Compatibility
        </motion.p>
        <motion.h2
          className="text-2xl md:text-3xl font-semibold tracking-tight text-white/85 mb-3"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          custom={1}
        >
          Works with every bank
        </motion.h2>
        <motion.p
          className="text-[13px] text-white/30 max-w-md mx-auto leading-relaxed mb-14"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          custom={2}
        >
          No API integrations needed. If your bank sends a PDF or email,
          WealthDelta can read it.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3" style={{ perspective: 800 }}>
          {banks.map((bank, i) => (
            <motion.div
              key={bank.name}
              className="group cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 p-5 backdrop-blur-xl transition-all hover:border-[#CA8A04]/20 hover:bg-black/50"
              variants={cardMorph}
              initial="hidden"
              whileInView="visible"
              viewport={vp}
              custom={i}
            >
              <p className="text-sm font-medium text-white/55 transition-colors group-hover:text-white/80">
                {bank.name}
              </p>
              <p className="text-[11px] text-white/20 transition-colors group-hover:text-white/30">
                {bank.type}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
