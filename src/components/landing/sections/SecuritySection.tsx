'use client';

import { motion } from 'framer-motion';
import { slideLeft, cardMorph, vp } from '../animations';

const stats = [
  { label: 'Bank credentials stored', value: 'Zero', accent: true },
  { label: 'Third-party data sharing', value: 'None', accent: false },
  { label: 'PII sent to AI', value: 'Masked', accent: true },
  { label: 'Data isolation', value: 'Row-level', accent: true },
];

export function SecuritySection() {
  return (
    <section className="relative py-32 px-6">
      <div
        className="mx-auto max-w-4xl flex flex-col md:flex-row gap-12 items-start"
        style={{ perspective: 1000 }}
      >
        <motion.div
          className="flex-1 max-w-sm"
          variants={slideLeft}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
        >
          <p className="text-[11px] text-[#CA8A04]/40 tracking-widest uppercase mb-4 font-medium">
            Security
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-white/80 leading-snug mb-4">
            Your data stays yours
          </h2>
          <p className="text-[13px] text-white/30 leading-relaxed">
            No bank credentials stored. PII masked before AI processing.
            Row-level security isolates every account.
          </p>
        </motion.div>

        <div
          className="flex-1 w-full max-w-md space-y-3"
          style={{ perspective: 800 }}
        >
          {stats.map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 backdrop-blur-sm"
              variants={cardMorph}
              initial="hidden"
              whileInView="visible"
              viewport={vp}
              custom={i + 3}
            >
              <span className="text-[13px] text-white/25">{item.label}</span>
              <span
                className={`font-mono text-sm font-medium ${
                  item.accent ? 'text-[#CA8A04]/70' : 'text-white/55'
                }`}
              >
                {item.value}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
