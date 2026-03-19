'use client';

import { Upload, Mail, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp, cardMorph, vp } from '../animations';

const cards = [
  {
    icon: Upload,
    title: 'Upload once',
    body: 'Drag in statements from any bank. AI reads the PDFs and builds your portfolio automatically.',
  },
  {
    icon: Mail,
    title: 'Stay current',
    body: 'Forward bank emails to your vault address. Holdings update as they arrive.',
  },
  {
    icon: FileText,
    title: 'Read the summary',
    body: 'Every morning, a briefing lands in your inbox. Portfolio delta, risk flags, action items.',
  },
];

export function ProblemSection() {
  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-3xl">
        <motion.p
          className="text-[11px] text-[#CA8A04]/50 tracking-widest uppercase mb-4 font-medium"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          custom={0}
        >
          How it works
        </motion.p>
        <motion.h2
          className="text-2xl md:text-3xl font-semibold tracking-tight text-white/85 leading-snug max-w-xl mb-14"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          custom={1}
        >
          Your wealth is scattered across custodians, currencies, and inboxes.
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ perspective: 800 }}>
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              className="group cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 p-6 backdrop-blur-xl transition-all hover:border-[#CA8A04]/20 hover:bg-black/50 hover:shadow-[0_0_30px_rgba(202,138,4,0.06)]"
              variants={cardMorph}
              initial="hidden"
              whileInView="visible"
              viewport={vp}
              custom={i}
            >
              <div className="mb-4 inline-flex rounded-lg border border-[#CA8A04]/20 bg-[#CA8A04]/[0.08] p-2.5">
                <card.icon className="size-4 text-[#CA8A04]/80" />
              </div>
              <h3 className="text-sm font-medium text-white/70 mb-2">{card.title}</h3>
              <p className="text-[13px] text-white/30 leading-relaxed">{card.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
