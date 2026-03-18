'use client';

import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform, useSpring, type Variants } from 'framer-motion';

// ─── Shared scroll store (bridges DOM → Canvas) ─────────────────────

const scrollStore = { progress: 0 };

// ─── 3D background objects ──────────────────────────────────────────

function FloatingRing({ position, color, speed }: { position: [number, number, number]; color: string; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.x = s.clock.elapsedTime * speed * 0.3;
    ref.current.rotation.z = s.clock.elapsedTime * speed * 0.2;
  });
  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[0.5, 0.015, 16, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} />
    </mesh>
  );
}

function FloatingOctahedron({ position, color, speed }: { position: [number, number, number]; color: string; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * speed * 0.4;
    ref.current.rotation.x = Math.sin(s.clock.elapsedTime * speed * 0.2) * 0.5;
  });
  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[0.25]} />
      <meshBasicMaterial color={color} transparent opacity={0.06} wireframe />
    </mesh>
  );
}

function Particles({ count = 600 }: { count?: number }) {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = Math.random() * -40;
    }
    return pos;
  }, [count]);
  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.005;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#ffffff" transparent opacity={0.2} sizeAttenuation />
    </points>
  );
}

function CameraRig() {
  const { camera } = useThree();
  const smoothZ = useRef(5);

  useFrame(() => {
    const t = scrollStore.progress;
    const target = THREE.MathUtils.lerp(5, -20, t);
    smoothZ.current = THREE.MathUtils.lerp(smoothZ.current, target, 0.06);
    camera.position.z = smoothZ.current;
    camera.position.x = Math.sin(t * Math.PI * 2) * 0.3;
    camera.position.y = Math.cos(t * Math.PI * 1.5) * 0.15;
  });

  return null;
}

function Scene() {
  return (
    <>
      <CameraRig />
      <fog attach="fog" args={['#030305', 5, 30]} />
      <ambientLight intensity={0.15} />
      <Stars radius={50} depth={60} count={2000} factor={2.5} saturation={0} fade speed={0.3} />
      <Particles />
      <FloatingRing position={[-4, 1.5, -3]} color="#60a5fa" speed={0.5} />
      <FloatingRing position={[5, -0.5, -10]} color="#a78bfa" speed={0.3} />
      <FloatingRing position={[-3, 2, -18]} color="#34d399" speed={0.4} />
      <FloatingRing position={[4, -1, -25]} color="#fbbf24" speed={0.6} />
      <FloatingOctahedron position={[3.5, 2, -2]} color="#ffffff" speed={0.4} />
      <FloatingOctahedron position={[-5, -1, -8]} color="#60a5fa" speed={0.5} />
      <FloatingOctahedron position={[3, 1.5, -15]} color="#a78bfa" speed={0.3} />
      <FloatingOctahedron position={[-4, -0.5, -22]} color="#34d399" speed={0.45} />
      <FloatingOctahedron position={[5, 2, -28]} color="#fbbf24" speed={0.35} />
    </>
  );
}

// ─── Animation variants ─────────────────────────────────────────────

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1, delay: i * 0.12, ease },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.9, delay: i * 0.1, ease },
  }),
};

const cardMorph: Variants = {
  hidden: (i: number) => {
    const directions = [
      { x: -120, y: 60, rotateY: 25, rotateX: -10 },
      { x: 0, y: 100, rotateY: 0, rotateX: 15 },
      { x: 120, y: 60, rotateY: -25, rotateX: -10 },
      { x: -80, y: 40, rotateY: 15, rotateX: 8 },
      { x: 60, y: 80, rotateY: -20, rotateX: -12 },
      { x: 100, y: -40, rotateY: -15, rotateX: 10 },
    ];
    const d = directions[i % directions.length];
    return {
      opacity: 0,
      x: d.x,
      y: d.y,
      scale: 0.4,
      rotateY: d.rotateY,
      rotateX: d.rotateX,
      filter: 'blur(8px)',
    };
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotateY: 0,
    rotateX: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 1,
      delay: 0.1 + i * 0.15,
      ease,
    },
  }),
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: -80, rotateY: 8, scale: 0.92 },
  visible: {
    opacity: 1, x: 0, rotateY: 0, scale: 1,
    transition: { duration: 1, ease },
  },
};

const slideRight: Variants = {
  hidden: { opacity: 0, x: 80, rotateY: -8, scale: 0.92 },
  visible: {
    opacity: 1, x: 0, rotateY: 0, scale: 1,
    transition: { duration: 1, ease },
  },
};

const vp = { once: true, margin: '-80px' as const, amount: 0.2 as const };

// ─── DOM content sections ───────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <motion.h1
        className="text-[clamp(2.5rem,7vw,5rem)] font-semibold tracking-[-0.04em] text-white leading-[1.08]"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        Every bank.
        <br />
        Every holding.
        <br />
        <span className="text-white/20">One briefing.</span>
      </motion.h1>

      <motion.p
        className="mt-6 max-w-sm text-sm text-white/30 leading-relaxed"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={2}
      >
        Upload statements from any bank. Get an AI-generated executive summary in your inbox every morning.
      </motion.p>

      <motion.div
        className="mt-8 flex items-center gap-4"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={3}
      >
        <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors">
          Create Account <ArrowRight className="size-3.5" />
        </Link>
        <Link href="/login" className="text-sm text-white/25 hover:text-white/50 transition-colors">Sign in</Link>
      </motion.div>

      <motion.div
        className="mt-20 flex items-center gap-8 text-[11px] tracking-widest text-white/10 uppercase"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        custom={5}
      >
        {['UBS', 'JBWere', 'Stonehage Fleming', 'Macquarie', 'Bell Potter', 'Morgan Stanley'].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </motion.div>
    </section>
  );
}

function ProblemSection() {
  const cards = [
    { title: 'Upload once', body: 'Drag in statements from any bank. AI reads the PDFs and builds your portfolio automatically.' },
    { title: 'Stay current', body: 'Forward bank emails to your vault address. Holdings update as they arrive.' },
    { title: 'Read the summary', body: 'Every morning, a briefing lands in your inbox. Portfolio delta, risk flags, action items.' },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-3xl">
        <motion.p
          className="text-[11px] text-white/15 tracking-widest uppercase mb-4"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          custom={0}
        >
          The problem
        </motion.p>
        <motion.h2
          className="text-2xl md:text-3xl font-semibold tracking-tight text-white/75 leading-snug max-w-xl mb-14"
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
              className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-xl p-6"
              variants={cardMorph}
              initial="hidden"
              whileInView="visible"
              viewport={vp}
              custom={i}
            >
              <h3 className="text-sm font-medium text-white/60 mb-2">{card.title}</h3>
              <p className="text-[13px] text-white/25 leading-relaxed">{card.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BriefingSection() {
  const rows = [
    { color: 'text-emerald-400/70', label: '+$24,350', text: 'Portfolio up 0.31% overnight. BHP rallied 2.1% on iron ore demand.' },
    { color: 'text-amber-400/70', label: 'WATCH', text: 'UBS rebalancing this week. Equity allocation shifting.' },
    { color: 'text-blue-400/70', label: 'DIVIDEND', text: 'CBA ex-dividend in 3 days. $4,200 to JBWere account.' },
    { color: 'text-rose-400/70', label: 'RISK', text: 'AUD/USD down 0.8%. USD holdings gained $12k on FX alone.' },
  ];

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
          <p className="text-[11px] text-white/15 tracking-widest uppercase mb-4">Daily briefing</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white/75 leading-snug mb-4">
            60 seconds to know everything
          </h2>
          <p className="text-[13px] text-white/25 leading-relaxed mb-6">
            Claude reads your entire portfolio, compares it to yesterday, checks what moved and why, then writes you a briefing.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-1.5 text-[13px] text-white/35 hover:text-white transition-colors">
            Start receiving briefings <ArrowRight className="size-3" />
          </Link>
        </motion.div>

        <motion.div
          className="flex-1 w-full max-w-md rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
          variants={slideRight}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
        >
          <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <span className="text-[11px] text-white/20 tracking-widest uppercase">Executive Summary</span>
            <span className="text-[11px] text-white/10 font-mono">6:00 AM</span>
          </div>
          <div className="p-5 space-y-4 text-[13px]">
            {rows.map((row) => (
              <div key={row.label} className="flex gap-3">
                <span className={`${row.color} font-mono text-[11px] shrink-0 w-16 text-right`}>{row.label}</span>
                <p className="text-white/35">{row.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BanksSection() {
  const banks = [
    { name: 'UBS', type: 'Private Bank' },
    { name: 'JBWere', type: 'Wealth Management' },
    { name: 'Stonehage Fleming', type: 'Family Office' },
    { name: 'Macquarie', type: 'Banking & Wrap' },
    { name: 'Bell Potter', type: 'Securities' },
    { name: 'Morgan Stanley', type: 'Wealth Management' },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <motion.p
          className="text-[11px] text-white/15 tracking-widest uppercase mb-4"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          custom={0}
        >
          Compatibility
        </motion.p>
        <motion.h2
          className="text-2xl md:text-3xl font-semibold tracking-tight text-white/75 mb-3"
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
          No API integrations needed. If your bank sends a PDF or email, WealthDelta can read it.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3" style={{ perspective: 800 }}>
          {banks.map((bank, i) => (
            <motion.div
              key={bank.name}
              className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-xl p-5"
              variants={cardMorph}
              initial="hidden"
              whileInView="visible"
              viewport={vp}
              custom={i}
            >
              <p className="text-sm font-medium text-white/45 mb-0.5">{bank.name}</p>
              <p className="text-[11px] text-white/15">{bank.type}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const stats = [
    { label: 'Bank credentials stored', value: 'Zero' },
    { label: 'Third-party data sharing', value: 'None' },
    { label: 'PII sent to AI', value: 'Masked' },
    { label: 'Data isolation', value: 'Row-level' },
  ];

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
          <p className="text-[11px] text-white/15 tracking-widest uppercase mb-4">Security</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white/75 leading-snug mb-4">
            Your data stays yours
          </h2>
          <p className="text-[13px] text-white/25 leading-relaxed">
            No bank credentials stored. PII masked before AI processing. Row-level security isolates every account.
          </p>
        </motion.div>

        <div className="flex-1 w-full max-w-md space-y-3" style={{ perspective: 800 }}>
          {stats.map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-center justify-between bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-xl px-5 py-4"
              variants={cardMorph}
              initial="hidden"
              whileInView="visible"
              viewport={vp}
              custom={i + 3}
            >
              <span className="text-[13px] text-white/25">{item.label}</span>
              <span className="text-[13px] font-medium text-white/55">{item.value}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative py-32 px-6 text-center" style={{ perspective: 1000 }}>
      <motion.div
        className="mx-auto max-w-lg"
        initial={{ opacity: 0, scale: 0.5, rotateX: 20, filter: 'blur(12px)' }}
        whileInView={{ opacity: 1, scale: 1, rotateX: 0, filter: 'blur(0px)' }}
        viewport={vp}
        transition={{ duration: 1.2, ease }}
      >
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white/85 mb-4">
          Five minutes to clarity
        </h2>
        <p className="text-[13px] text-white/25 mb-10 max-w-sm mx-auto leading-relaxed">
          Upload your first statement. Get your unified portfolio. Start receiving daily briefings.
        </p>
        <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-6 py-3 rounded-md hover:bg-white/90 transition-colors">
          Get Started <ArrowRight className="size-3.5" />
        </Link>
      </motion.div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="relative border-t border-white/[0.04] py-8 px-6">
      <div className="mx-auto max-w-5xl flex items-center justify-between">
        <span className="text-[11px] text-white/15">&copy; {new Date().getFullYear()} WealthDelta</span>
        <div className="flex items-center gap-6 text-[11px] text-white/15">
          <Link href="/login" className="hover:text-white/40 transition-colors">Sign In</Link>
          <Link href="/signup" className="hover:text-white/40 transition-colors">Get Started</Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/[0.04]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <span className="text-sm font-semibold tracking-tight text-white/85">WealthDelta</span>
        <div className="flex items-center gap-1">
          <Link href="/login" className="text-[13px] text-white/35 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5">Sign In</Link>
          <Link href="/signup" className="text-[13px] text-black font-medium bg-white hover:bg-white/90 transition-colors px-3.5 py-1.5 rounded-md">Get Started</Link>
        </div>
      </div>
    </header>
  );
}

// ─── Main ────────────────────────────────────────────────────────────

export function LandingScene3D() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!scrollRef.current) return;
      const el = scrollRef.current;
      scrollStore.progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
    };
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', onScroll, { passive: true });
    return () => { if (el) el.removeEventListener('scroll', onScroll); };
  }, []);

  return (
    <div className="relative h-screen w-screen bg-[#030305]">
      {/* 3D background - fixed behind everything */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50, near: 0.1, far: 80 }}
        style={{ position: 'fixed', inset: 0, zIndex: 0 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#030305']} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* DOM content - scrolls on top */}
      <div ref={scrollRef} className="relative z-10 h-screen overflow-y-auto">
        <Nav />
        <HeroSection />
        <ProblemSection />
        <BriefingSection />
        <BanksSection />
        <SecuritySection />
        <CTASection />
        <FooterSection />
      </div>
    </div>
  );
}
