'use client';

import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, ScrollControls, useScroll, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const TOTAL_Z = 55;
const PANEL_GAP = 11;
const PAGES = 12;

// ─── Floating geometric shapes ───────────────────────────────────────

function FloatingRing({ position, color, speed }: { position: [number, number, number]; color: string; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.x = s.clock.elapsedTime * speed * 0.3;
    ref.current.rotation.z = s.clock.elapsedTime * speed * 0.2;
  });
  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[0.4, 0.015, 16, 48]} />
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
      <octahedronGeometry args={[0.2]} />
      <meshBasicMaterial color={color} transparent opacity={0.06} wireframe />
    </mesh>
  );
}

function SceneObjects() {
  return (
    <>
      <FloatingRing position={[-4, 1.5, -5]} color="#60a5fa" speed={0.5} />
      <FloatingRing position={[5, -0.5, -16]} color="#a78bfa" speed={0.3} />
      <FloatingRing position={[-3, 2, -28]} color="#34d399" speed={0.4} />
      <FloatingRing position={[4, -1, -40]} color="#fbbf24" speed={0.6} />
      <FloatingRing position={[-3, 0.5, -50]} color="#fb7185" speed={0.35} />
      <FloatingOctahedron position={[3.5, 2, -3]} color="#ffffff" speed={0.4} />
      <FloatingOctahedron position={[-5, -1, -12]} color="#60a5fa" speed={0.5} />
      <FloatingOctahedron position={[3, 1.5, -24]} color="#a78bfa" speed={0.3} />
      <FloatingOctahedron position={[-4, -0.5, -36]} color="#34d399" speed={0.45} />
      <FloatingOctahedron position={[5, 2, -48]} color="#fbbf24" speed={0.35} />
    </>
  );
}

function Particles({ count = 800 }: { count?: number }) {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = Math.random() * -65;
    }
    return pos;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.006;
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

// ─── Camera rig ──────────────────────────────────────────────────────

function CameraRig() {
  const scroll = useScroll();
  const { camera } = useThree();
  const smoothZ = useRef(5);

  useFrame(() => {
    const t = scroll.offset;
    const targetZ = THREE.MathUtils.lerp(5, 5 - TOTAL_Z, t);
    smoothZ.current = THREE.MathUtils.lerp(smoothZ.current, targetZ, 0.08);
    camera.position.z = smoothZ.current;
    camera.position.x = Math.sin(t * Math.PI * 1.5) * 0.2;
    camera.position.y = Math.cos(t * Math.PI) * 0.15;
  });

  return null;
}

// ─── Visibility wrapper ──────────────────────────────────────────────

function Panel({ z, children, range = 8 }: { z: number; children: React.ReactNode; range?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    const dist = Math.abs(camera.position.z - z);
    const raw = THREE.MathUtils.clamp(1 - dist / range, 0, 1);
    const opacity = raw * raw;
    groupRef.current.visible = opacity > 0.005;

    const els = document.querySelectorAll(`[data-pz="${z}"]`);
    els.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = String(opacity);
      htmlEl.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
    });
  });

  return <group ref={groupRef} position={[0, 0, z]}>{children}</group>;
}

// ─── Panels ──────────────────────────────────────────────────────────

function HeroPanel() {
  return (
    <Panel z={0} range={9}>
      <Float speed={1.2} rotationIntensity={0.04} floatIntensity={0.15}>
        <Html center distanceFactor={4.5}>
          <div data-pz="0" className="w-[420px] text-center select-none">
            <h1 className="text-[2.8rem] font-semibold tracking-[-0.03em] text-white leading-[1.1] mb-4">
              Every bank.
              <br />
              Every holding.
              <br />
              <span className="text-white/20">One briefing.</span>
            </h1>
            <p className="text-white/30 text-xs max-w-[280px] mx-auto leading-relaxed mb-6">
              Upload statements from any bank. Get an AI-generated executive summary in your inbox every morning.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/signup" className="inline-flex items-center gap-1.5 bg-white text-black text-xs font-medium px-4 py-2 rounded-md hover:bg-white/90 transition-colors">
                Create Account <ArrowRight className="size-3" />
              </Link>
              <Link href="/login" className="text-xs text-white/20 hover:text-white/40 transition-colors">Sign in</Link>
            </div>
            <div className="mt-10 flex items-center justify-center gap-5 text-[9px] tracking-widest text-white/10 uppercase">
              {['UBS', 'JBWere', 'Macquarie', 'Bell Potter', 'Morgan Stanley'].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
          </div>
        </Html>
      </Float>
    </Panel>
  );
}

function ProblemPanel() {
  const cards = [
    { title: 'Upload once', body: 'Drag in statements from any bank. AI reads the PDFs and builds your portfolio.' },
    { title: 'Stay current', body: 'Forward bank emails to your vault address. Holdings update automatically.' },
    { title: 'Read the summary', body: 'Every morning, a briefing lands in your inbox with portfolio delta and risk flags.' },
  ];

  return (
    <Panel z={-PANEL_GAP} range={8}>
      <Html position={[0, 1.8, 0]} center distanceFactor={4}>
        <div data-pz={-PANEL_GAP} className="w-[360px] text-center select-none">
          <p className="text-[10px] text-white/15 tracking-widest uppercase mb-2">The problem</p>
          <h2 className="text-lg font-semibold tracking-tight text-white/70 leading-snug">
            Your wealth is scattered across custodians, currencies, and inboxes.
          </h2>
        </div>
      </Html>
      {cards.map((card, i) => (
        <Float key={card.title} speed={0.8 + i * 0.2} rotationIntensity={0.02} floatIntensity={0.08}>
          <Html
            position={[(i - 1) * 2.4, -0.6, 0]}
            center
            distanceFactor={3.5}
          >
            <div data-pz={-PANEL_GAP} className="w-[170px] bg-white/[0.03] backdrop-blur border border-white/[0.05] rounded-lg p-4 select-none">
              <h3 className="text-[11px] font-medium text-white/50 mb-1">{card.title}</h3>
              <p className="text-[10px] text-white/20 leading-relaxed">{card.body}</p>
            </div>
          </Html>
        </Float>
      ))}
    </Panel>
  );
}

function BriefingPanel() {
  const rows = [
    { color: 'text-emerald-400/60', label: '+$24,350', text: 'Portfolio up 0.31%. BHP rallied on iron ore data.' },
    { color: 'text-amber-400/60', label: 'WATCH', text: 'UBS rebalancing this week. Equity allocation shifting.' },
    { color: 'text-blue-400/60', label: 'DIVIDEND', text: 'CBA ex-div in 3 days. $4,200 to JBWere account.' },
    { color: 'text-rose-400/60', label: 'RISK', text: 'AUD/USD down 0.8%. USD holdings gained $12k on FX.' },
  ];

  return (
    <Panel z={-PANEL_GAP * 2} range={9}>
      <Html position={[-2.2, 0.3, 0]} center distanceFactor={4}>
        <div data-pz={-PANEL_GAP * 2} className="w-[200px] select-none">
          <p className="text-[10px] text-white/15 tracking-widest uppercase mb-2">Daily briefing</p>
          <h2 className="text-base font-semibold tracking-tight text-white/70 leading-snug mb-2">
            60 seconds to know everything
          </h2>
          <p className="text-[10px] text-white/20 leading-relaxed mb-4">
            Claude reads your entire portfolio, checks what moved, and writes your morning briefing.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-white transition-colors">
            Start receiving briefings <ArrowRight className="size-2.5" />
          </Link>
        </div>
      </Html>
      <Float speed={0.8} rotationIntensity={0.02} floatIntensity={0.1}>
        <Html position={[2, 0, 0]} center distanceFactor={4}>
          <div data-pz={-PANEL_GAP * 2} className="w-[260px] rounded-lg border border-white/[0.05] bg-white/[0.02] backdrop-blur overflow-hidden select-none">
            <div className="px-3 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
              <span className="text-[9px] text-white/20 tracking-widest uppercase">Executive Summary</span>
              <span className="text-[9px] text-white/10 font-mono">6:00 AM</span>
            </div>
            <div className="p-3 space-y-2.5">
              {rows.map((row) => (
                <div key={row.label} className="flex gap-2">
                  <span className={`${row.color} font-mono text-[9px] shrink-0 w-12 text-right`}>{row.label}</span>
                  <p className="text-[10px] text-white/30">{row.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Html>
      </Float>
    </Panel>
  );
}

function BanksPanel() {
  const banks = [
    { name: 'UBS', type: 'Private Bank' },
    { name: 'JBWere', type: 'Wealth Mgmt' },
    { name: 'Stonehage Fleming', type: 'Family Office' },
    { name: 'Macquarie', type: 'Banking' },
    { name: 'Bell Potter', type: 'Securities' },
    { name: 'Morgan Stanley', type: 'Wealth Mgmt' },
  ];

  return (
    <Panel z={-PANEL_GAP * 3} range={8}>
      <Html position={[0, 2, 0]} center distanceFactor={4}>
        <div data-pz={-PANEL_GAP * 3} className="w-[300px] text-center select-none">
          <p className="text-[10px] text-white/15 tracking-widest uppercase mb-2">Compatibility</p>
          <h2 className="text-lg font-semibold tracking-tight text-white/70 mb-1">
            Works with every bank
          </h2>
          <p className="text-[10px] text-white/20 max-w-[240px] mx-auto leading-relaxed">
            No API integrations needed. If your bank sends a PDF or email, WealthDelta can read it.
          </p>
        </div>
      </Html>
      {banks.map((bank, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = (col - 1) * 2.2;
        const y = -row * 1.6;
        return (
          <Float key={bank.name} speed={0.6 + i * 0.1} rotationIntensity={0.015} floatIntensity={0.06}>
            <Html position={[x, y, 0]} center distanceFactor={3.2}>
              <div data-pz={-PANEL_GAP * 3} className="w-[130px] bg-white/[0.03] backdrop-blur border border-white/[0.05] rounded-lg p-3 text-center select-none">
                <p className="text-[11px] font-medium text-white/40 mb-0.5">{bank.name}</p>
                <p className="text-[9px] text-white/12">{bank.type}</p>
              </div>
            </Html>
          </Float>
        );
      })}
    </Panel>
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
    <Panel z={-PANEL_GAP * 4} range={8}>
      <Html position={[-1.8, 0.5, 0]} center distanceFactor={4}>
        <div data-pz={-PANEL_GAP * 4} className="w-[200px] select-none">
          <p className="text-[10px] text-white/15 tracking-widest uppercase mb-2">Security</p>
          <h2 className="text-base font-semibold tracking-tight text-white/70 leading-snug mb-2">
            Your data stays yours
          </h2>
          <p className="text-[10px] text-white/20 leading-relaxed">
            No bank credentials stored. PII masked before AI processing. Row-level security isolates every account.
          </p>
        </div>
      </Html>
      {stats.map((item, i) => (
        <Float key={item.label} speed={0.5 + i * 0.15} rotationIntensity={0.01} floatIntensity={0.05}>
          <Html position={[1.8, 1 - i * 0.8, 0]} center distanceFactor={3.2}>
            <div data-pz={-PANEL_GAP * 4} className="w-[190px] flex items-center justify-between bg-white/[0.03] backdrop-blur border border-white/[0.05] rounded-lg px-3 py-2 select-none">
              <span className="text-[10px] text-white/20">{item.label}</span>
              <span className="text-[10px] font-medium text-white/45">{item.value}</span>
            </div>
          </Html>
        </Float>
      ))}
    </Panel>
  );
}

function CTAPanel() {
  return (
    <Panel z={-PANEL_GAP * 5} range={9}>
      <Float speed={1} rotationIntensity={0.03} floatIntensity={0.12}>
        <Html center distanceFactor={4.5}>
          <div data-pz={-PANEL_GAP * 5} className="w-[360px] text-center select-none">
            <h2 className="text-2xl font-semibold tracking-tight text-white/80 mb-3">
              Five minutes to clarity
            </h2>
            <p className="text-[10px] text-white/20 mb-6 max-w-[260px] mx-auto leading-relaxed">
              Upload your first statement. Get your unified portfolio. Start receiving daily briefings.
            </p>
            <Link href="/signup" className="inline-flex items-center gap-1.5 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors">
              Get Started <ArrowRight className="size-3" />
            </Link>
          </div>
        </Html>
      </Float>
    </Panel>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────

function SceneContent() {
  return (
    <>
      <CameraRig />
      <fog attach="fog" args={['#030305', 8, 45]} />
      <ambientLight intensity={0.15} />
      <Stars radius={60} depth={70} count={2000} factor={2.5} saturation={0} fade speed={0.3} />
      <Particles count={800} />
      <SceneObjects />
      <HeroPanel />
      <ProblemPanel />
      <BriefingPanel />
      <BanksPanel />
      <SecurityPanel />
      <CTAPanel />
    </>
  );
}

// ─── Overlays ────────────────────────────────────────────────────────

function NavOverlay() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/[0.04]">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
        <span className="text-xs font-semibold tracking-tight text-white/80">WealthDelta</span>
        <div className="flex items-center gap-1">
          <Link href="/login" className="text-[11px] text-white/35 hover:text-white transition-colors px-2.5 py-1 rounded-md hover:bg-white/5">Sign In</Link>
          <Link href="/signup" className="text-[11px] text-black font-medium bg-white hover:bg-white/90 transition-colors px-3 py-1 rounded-md">Get Started</Link>
        </div>
      </div>
    </header>
  );
}

function ScrollHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    const handler = () => setVisible(false);
    window.addEventListener('wheel', handler, { once: true, passive: true });
    window.addEventListener('touchmove', handler, { once: true, passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('wheel', handler);
      window.removeEventListener('touchmove', handler);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 animate-pulse">
      <span className="text-[9px] text-white/15 tracking-widest uppercase">Scroll to explore</span>
      <svg className="w-3.5 h-3.5 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────

export function LandingScene3D() {
  return (
    <div className="h-screen w-screen bg-[#030305]">
      <NavOverlay />
      <ScrollHint />
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50, near: 0.1, far: 120 }}
        style={{ position: 'fixed', inset: 0 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#030305']} />
        <Suspense fallback={null}>
          <ScrollControls pages={PAGES} damping={0.15}>
            <SceneContent />
          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  );
}
