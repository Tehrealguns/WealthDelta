'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, ScrollControls, useScroll, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

function Particles({ count = 800 }: { count?: number }) {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = Math.random() * -90;
    }
    return pos;
  }, [count]);

  const ref = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.01;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#ffffff"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  );
}

function CameraRig() {
  const scroll = useScroll();
  const { camera } = useThree();

  useFrame(() => {
    const offset = scroll.offset;
    camera.position.z = 10 - offset * 95;
    camera.position.x = Math.sin(offset * Math.PI * 2) * 0.3;
    camera.position.y = Math.cos(offset * Math.PI) * 0.2;
  });

  return null;
}

function HeroPanel() {
  return (
    <group position={[0, 0, 0]}>
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <Html center transform distanceFactor={8} style={{ pointerEvents: 'auto' }}>
          <div className="w-[700px] text-center select-none">
            <h1 className="text-[5rem] font-semibold tracking-[-0.04em] text-white leading-[1.05] mb-6">
              Every bank.
              <br />
              Every holding.
              <br />
              <span className="text-white/25">One briefing.</span>
            </h1>
            <p className="text-white/35 text-base max-w-sm mx-auto leading-relaxed mb-10">
              Upload statements from any bank. Get an AI-generated executive summary in your inbox every morning.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors"
              >
                Create Account
                <ArrowRight className="size-3.5" />
              </Link>
              <Link href="/login" className="text-sm text-white/25 hover:text-white/50 transition-colors">
                Sign in
              </Link>
            </div>
            <div className="mt-20 flex items-center justify-center gap-8 text-[11px] tracking-wide text-white/15 uppercase">
              {['UBS', 'JBWere', 'Stonehage Fleming', 'Macquarie', 'Bell Potter', 'Morgan Stanley'].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
          </div>
        </Html>
      </Float>
    </group>
  );
}

function ProblemPanel() {
  const cards = [
    { title: 'Upload once', body: 'Drag in your latest statements from any bank. AI reads the PDFs and builds your portfolio automatically.' },
    { title: 'Stay current', body: 'Forward bank emails to your unique vault address. Trades, dividends, and valuations update as they arrive.' },
    { title: 'Read the summary', body: 'Every morning, an executive briefing lands in your inbox. Portfolio delta, risk flags, action items.' },
  ];

  return (
    <group position={[0, 0, -15]}>
      <Html position={[0, 2.5, 0]} center transform distanceFactor={8}>
        <div className="w-[600px] select-none">
          <p className="text-[13px] text-white/20 tracking-widest uppercase mb-4">The problem</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white/80 leading-snug max-w-xl">
            Your wealth is scattered across custodians, currencies, and inboxes.
          </h2>
        </div>
      </Html>
      {cards.map((card, i) => (
        <group key={card.title} position={[(i - 1) * 3.5, -1.5, i * 0.5]} rotation={[0, (i - 1) * -0.08, 0]}>
          <Html center transform distanceFactor={6} style={{ pointerEvents: 'none' }}>
            <div className="w-[280px] bg-black/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-6 select-none">
              <h3 className="text-sm font-medium text-white/70 mb-2">{card.title}</h3>
              <p className="text-[13px] text-white/25 leading-relaxed">{card.body}</p>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function BriefingPanel() {
  const rows = [
    { color: 'text-emerald-400/70', label: '+$24,350', text: 'Portfolio up 0.31% overnight. BHP rallied 2.1% on iron ore demand data from China.' },
    { color: 'text-amber-400/70', label: 'WATCH', text: 'UBS rebalancing this week. Expect allocation shifts in equities bucket.' },
    { color: 'text-blue-400/70', label: 'DIVIDEND', text: 'CBA ex-dividend in 3 days. $4,200 expected distribution to JBWere account.' },
    { color: 'text-rose-400/70', label: 'RISK', text: 'AUD/USD down 0.8%. USD-denominated holdings gained $12k on FX alone.' },
  ];

  return (
    <group position={[0, 0, -30]}>
      <group position={[-3.5, 0.5, 0]} rotation={[0, 0.05, 0]}>
        <Html center transform distanceFactor={7} style={{ pointerEvents: 'auto' }}>
          <div className="w-[300px] select-none">
            <p className="text-[13px] text-white/20 tracking-widest uppercase mb-4">Daily briefing</p>
            <h2 className="text-2xl font-semibold tracking-tight text-white/80 leading-snug mb-4">
              60 seconds to know everything
            </h2>
            <p className="text-[13px] text-white/25 leading-relaxed mb-6">
              Claude reads your entire portfolio, compares it to yesterday, checks what moved and why, then writes you a briefing.
            </p>
            <Link href="/signup" className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors">
              Start receiving briefings <ArrowRight className="size-3" />
            </Link>
          </div>
        </Html>
      </group>
      <Float speed={1} rotationIntensity={0.05} floatIntensity={0.2}>
        <group position={[2.5, 0, 1]} rotation={[0, -0.08, 0]}>
          <Html center transform distanceFactor={7} style={{ pointerEvents: 'none' }}>
            <div className="w-[400px] rounded-lg border border-white/[0.06] bg-black/60 backdrop-blur-sm overflow-hidden select-none">
              <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                <span className="text-[11px] text-white/25 tracking-widest uppercase">Executive Summary</span>
                <span className="text-[11px] text-white/15 font-mono">6:00 AM</span>
              </div>
              <div className="p-5 space-y-4 text-[13px]">
                {rows.map((row) => (
                  <div key={row.label} className="flex gap-3">
                    <span className={`${row.color} font-mono text-[11px] shrink-0 w-16 text-right`}>{row.label}</span>
                    <p className="text-white/40">{row.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Html>
        </group>
      </Float>
    </group>
  );
}

function BanksPanel() {
  const banks = [
    { name: 'UBS', type: 'Private Bank' },
    { name: 'JBWere', type: 'Wealth Management' },
    { name: 'Stonehage Fleming', type: 'Family Office' },
    { name: 'Macquarie', type: 'Banking & Wrap' },
    { name: 'Bell Potter', type: 'Securities' },
    { name: 'Morgan Stanley', type: 'Wealth Management' },
  ];

  return (
    <group position={[0, 0, -45]}>
      <Html position={[0, 3, 0]} center transform distanceFactor={8}>
        <div className="w-[500px] text-center select-none">
          <p className="text-[13px] text-white/20 tracking-widest uppercase mb-4">Compatibility</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white/80 leading-snug mb-4">
            Works with every bank
          </h2>
          <p className="text-[13px] text-white/25 max-w-md mx-auto leading-relaxed">
            No API integrations needed. If your bank sends you a PDF or email, WealthDelta can read it.
          </p>
        </div>
      </Html>
      {banks.map((bank, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const angle = (col - 1) * 0.25;
        const x = (col - 1) * 3;
        const y = -row * 2.2;
        return (
          <group key={bank.name} position={[x, y, Math.cos(angle) * 0.5]} rotation={[0, angle * 0.3, 0]}>
            <Html center transform distanceFactor={6} style={{ pointerEvents: 'none' }}>
              <div className="w-[200px] bg-black/60 backdrop-blur-sm border border-white/[0.06] rounded-lg p-5 text-center select-none">
                <p className="text-sm font-medium text-white/50 mb-0.5">{bank.name}</p>
                <p className="text-[11px] text-white/15">{bank.type}</p>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function SecurityPanel() {
  const stats = [
    { label: 'Bank credentials stored', value: 'Zero' },
    { label: 'Third-party data sharing', value: 'None' },
    { label: 'PII sent to AI', value: 'Masked' },
    { label: 'Data isolation', value: 'Row-level' },
  ];

  return (
    <group position={[0, 0, -60]}>
      <group position={[-3, 1, 0]} rotation={[0, 0.04, 0]}>
        <Html center transform distanceFactor={7}>
          <div className="w-[320px] select-none">
            <p className="text-[13px] text-white/20 tracking-widest uppercase mb-4">Security</p>
            <h2 className="text-2xl font-semibold tracking-tight text-white/80 leading-snug mb-4">
              Your data stays yours
            </h2>
            <p className="text-[13px] text-white/25 leading-relaxed">
              No bank credentials are stored. PII is masked before AI processing. Row-level security isolates every account.
            </p>
          </div>
        </Html>
      </group>
      {stats.map((item, i) => (
        <group key={item.label} position={[2.5, 1.5 - i * 1.2, i * 0.3]} rotation={[0, -0.06, 0]}>
          <Html center transform distanceFactor={6} style={{ pointerEvents: 'none' }}>
            <div className="w-[300px] flex items-center justify-between bg-black/60 backdrop-blur-sm border border-white/[0.06] rounded-lg px-5 py-3.5 select-none">
              <span className="text-[13px] text-white/25">{item.label}</span>
              <span className="text-[13px] font-medium text-white/60">{item.value}</span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function CTAPanel() {
  return (
    <group position={[0, 0, -75]}>
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.25}>
        <Html center transform distanceFactor={8} style={{ pointerEvents: 'auto' }}>
          <div className="w-[600px] text-center select-none">
            <h2 className="text-4xl font-semibold tracking-tight text-white/90 mb-4">
              Five minutes to clarity
            </h2>
            <p className="text-[13px] text-white/25 mb-10 max-w-sm mx-auto leading-relaxed">
              Upload your first statement. Get your unified portfolio. Start receiving daily briefings.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-6 py-3 rounded-md hover:bg-white/90 transition-colors"
            >
              Get Started
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </Html>
      </Float>
    </group>
  );
}

function SceneContent() {
  return (
    <>
      <CameraRig />
      <fog attach="fog" args={['#000000', 5, 50]} />
      <ambientLight intensity={0.3} />
      <Stars radius={60} depth={80} count={1500} factor={3} saturation={0} fade speed={0.5} />
      <Particles count={600} />
      <HeroPanel />
      <ProblemPanel />
      <BriefingPanel />
      <BanksPanel />
      <SecurityPanel />
      <CTAPanel />
    </>
  );
}

function NavOverlay() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/20">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <span className="text-sm font-semibold tracking-tight text-white/90">WealthDelta</span>
        <div className="flex items-center gap-1">
          <Link href="/login" className="text-[13px] text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5">
            Sign In
          </Link>
          <Link href="/signup" className="text-[13px] text-black font-medium bg-white hover:bg-white/90 transition-colors px-3.5 py-1.5 rounded-md">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

function FooterOverlay() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04] py-4 px-6 bg-black/20 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        <span className="text-[11px] text-white/15">WealthDelta</span>
        <div className="flex items-center gap-4 text-[11px] text-white/15">
          <Link href="/login" className="hover:text-white/30 transition-colors">Sign In</Link>
          <Link href="/signup" className="hover:text-white/30 transition-colors">Sign Up</Link>
        </div>
      </div>
    </footer>
  );
}

export function LandingScene3D() {
  return (
    <div className="h-screen w-screen bg-black">
      <NavOverlay />
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60, near: 0.1, far: 200 }}
        style={{ position: 'fixed', inset: 0 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#030305']} />
        <Suspense fallback={null}>
          <ScrollControls pages={6} damping={0.25}>
            <SceneContent />
          </ScrollControls>
        </Suspense>
      </Canvas>
      <FooterOverlay />
    </div>
  );
}
