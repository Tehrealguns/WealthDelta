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
          className="text-[11px] text-[#CA8A04]/40 tracking-widest uppercase mb-4 font-medium"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          custom={0}
        >
          Compatibility
        </motion.p>
        <motion.h2
          className="text-2xl md:text-3xl font-semibold tracking-tight text-white/80 mb-3"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          custom={1}
        >
          Works with every bank
        </motion.h2>
        <motion.p
          className="text-[13px] text-white/25 max-w-md mx-auto leading-relaxed mb-14"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          custom={2}
        >
          No API integrations needed. If your bank sends a PDF or email,
          WealthDelta can read it.
        </motion.p>

        <div
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
          style={{ perspective: 800 }}
        >
          {banks.map((bank, i) => (
            <motion.div
              key={bank.name}
              className="group cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm transition-colors hover:border-[#CA8A04]/15"
              variants={cardMorph}
              initial="hidden"
              whileInView="visible"
              viewport={vp}
              custom={i}
            >
              <p className="text-sm font-medium text-white/50 transition-colors group-hover:text-white/70">
                {bank.name}
              </p>
              <p className="text-[11px] text-white/15 transition-colors group-hover:text-white/25">
                {bank.type}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
