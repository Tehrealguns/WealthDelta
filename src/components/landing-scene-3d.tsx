'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, ScrollControls, useScroll, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// ─── Floating geometric shapes ───────────────────────────────────────

function FloatingRing({ position, color, speed }: { position: [number, number, number]; color: string; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * speed * 0.3;
    ref.current.rotation.z = state.clock.elapsedTime * speed * 0.2;
  });
  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[0.6, 0.02, 16, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.15} />
    </mesh>
  );
}

function FloatingOctahedron({ position, color, speed }: { position: [number, number, number]; color: string; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * speed * 0.4;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.2) * 0.5;
  });
  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[0.3]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} wireframe />
    </mesh>
  );
}

function SceneObjects() {
  return (
    <>
      <FloatingRing position={[-6, 2, -8]} color="#60a5fa" speed={0.5} />
      <FloatingRing position={[7, -1, -22]} color="#a78bfa" speed={0.3} />
      <FloatingRing position={[-5, 3, -38]} color="#34d399" speed={0.4} />
      <FloatingRing position={[6, -2, -52]} color="#fbbf24" speed={0.6} />
      <FloatingRing position={[-4, 1, -68]} color="#fb7185" speed={0.35} />
      <FloatingOctahedron position={[5, 3, -5]} color="#ffffff" speed={0.4} />
      <FloatingOctahedron position={[-7, -2, -18]} color="#60a5fa" speed={0.5} />
      <FloatingOctahedron position={[4, 2, -35]} color="#a78bfa" speed={0.3} />
      <FloatingOctahedron position={[-6, -1, -50]} color="#34d399" speed={0.45} />
      <FloatingOctahedron position={[7, 3, -65]} color="#fbbf24" speed={0.35} />
      <FloatingOctahedron position={[-3, -3, -78]} color="#fb7185" speed={0.5} />
    </>
  );
}

function Particles({ count = 1200 }: { count?: number }) {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 2] = Math.random() * -100;
    }
    return pos;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.008;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.25} sizeAttenuation />
    </points>
  );
}

// ─── Camera rig ──────────────────────────────────────────────────────

function CameraRig() {
  const scroll = useScroll();
  const { camera } = useThree();

  useFrame(() => {
    const t = scroll.offset;
    camera.position.z = THREE.MathUtils.lerp(8, -82, t);
    camera.position.x = Math.sin(t * Math.PI * 2) * 0.4;
    camera.position.y = Math.cos(t * Math.PI * 1.5) * 0.3;
  });

  return null;
}

// ─── Visibility wrapper: fades panel based on camera Z distance ──────

function Panel({
  z,
  children,
  range = 12,
}: {
  z: number;
  children: React.ReactNode;
  range?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    const dist = Math.abs(camera.position.z - z);
    const opacity = THREE.MathUtils.clamp(1 - dist / range, 0, 1);
    const scale = THREE.MathUtils.lerp(0.85, 1, opacity);
    groupRef.current.visible = opacity > 0.01;
    groupRef.current.scale.setScalar(scale);
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        const mat = child.material as THREE.Material;
        if (mat) mat.opacity = opacity;
      }
    });
    const htmlEls = groupRef.current.userData.htmlElements as HTMLElement[] | undefined;
    if (!htmlEls) {
      const container = document.querySelectorAll(`[data-panel-z="${z}"]`);
      if (container.length > 0) {
        groupRef.current.userData.htmlElements = Array.from(container);
      }
    }
    if (groupRef.current.userData.htmlElements) {
      (groupRef.current.userData.htmlElements as HTMLElement[]).forEach((el) => {
        el.style.opacity = String(opacity);
        el.style.transform = `scale(${scale})`;
        el.style.transition = 'none';
      });
    }
  });

  return <group ref={groupRef} position={[0, 0, z]}>{children}</group>;
}

// ─── Content sections ────────────────────────────────────────────────

function HeroPanel() {
  return (
    <Panel z={0} range={10}>
      <Float speed={1.5} rotationIntensity={0.08} floatIntensity={0.3}>
        <Html center distanceFactor={8} style={{ pointerEvents: 'auto' }}>
          <div data-panel-z="0" className="w-[700px] text-center select-none">
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
              <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors">
                Create Account <ArrowRight className="size-3.5" />
              </Link>
              <Link href="/login" className="text-sm text-white/25 hover:text-white/50 transition-colors">Sign in</Link>
            </div>
            <div className="mt-16 flex items-center justify-center gap-8 text-[11px] tracking-wide text-white/15 uppercase">
              {['UBS', 'JBWere', 'Stonehage Fleming', 'Macquarie', 'Bell Potter', 'Morgan Stanley'].map((n) => (
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
    { title: 'Upload once', body: 'Drag in your latest statements from any bank. AI reads the PDFs and builds your portfolio automatically.' },
    { title: 'Stay current', body: 'Forward bank emails to your unique vault address. Trades, dividends, and valuations update as they arrive.' },
    { title: 'Read the summary', body: 'Every morning, an executive briefing lands in your inbox. Portfolio delta, risk flags, action items.' },
  ];

  return (
    <Panel z={-18} range={13}>
      <Html position={[0, 2.8, 0]} center distanceFactor={8}>
        <div data-panel-z="-18" className="w-[600px] select-none">
          <p className="text-[13px] text-white/20 tracking-widest uppercase mb-4">The problem</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white/80 leading-snug max-w-xl">
            Your wealth is scattered across custodians, currencies, and inboxes.
          </h2>
        </div>
      </Html>
      {cards.map((card, i) => (
        <Float key={card.title} speed={1 + i * 0.3} rotationIntensity={0.05} floatIntensity={0.15}>
          <Html
            position={[(i - 1) * 3.8, -1.5, i * 0.8]}
            center
            distanceFactor={6}
            style={{ pointerEvents: 'none' }}
          >
            <div data-panel-z="-18" className="w-[280px] bg-black/70 backdrop-blur-md border border-white/[0.06] rounded-xl p-6 select-none">
              <h3 className="text-sm font-medium text-white/70 mb-2">{card.title}</h3>
              <p className="text-[13px] text-white/25 leading-relaxed">{card.body}</p>
            </div>
          </Html>
        </Float>
      ))}
    </Panel>
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
    <Panel z={-36} range={13}>
      <Html position={[-3.8, 0.5, 0]} center distanceFactor={7} style={{ pointerEvents: 'auto' }}>
        <div data-panel-z="-36" className="w-[300px] select-none">
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
      <Float speed={1} rotationIntensity={0.04} floatIntensity={0.2}>
        <Html position={[3, 0, 1.5]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
          <div data-panel-z="-36" className="w-[400px] rounded-lg border border-white/[0.06] bg-black/70 backdrop-blur-md overflow-hidden select-none">
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
      </Float>
    </Panel>
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
    <Panel z={-54} range={13}>
      <Html position={[0, 3.2, 0]} center distanceFactor={8}>
        <div data-panel-z="-54" className="w-[500px] text-center select-none">
          <p className="text-[13px] text-white/20 tracking-widest uppercase mb-4">Compatibility</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white/80 leading-snug mb-4">
            Works with every bank
          </h2>
          <p className="text-[13px] text-white/25 max-w-md mx-auto leading-relaxed">
            No API integrations needed. If your bank sends a PDF or email, WealthDelta can read it.
          </p>
        </div>
      </Html>
      {banks.map((bank, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = (col - 1) * 3.5;
        const y = -row * 2.5 + 0.5;
        return (
          <Float key={bank.name} speed={0.8 + i * 0.15} rotationIntensity={0.03} floatIntensity={0.12}>
            <Html position={[x, y, i * 0.4]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
              <div data-panel-z="-54" className="w-[200px] bg-black/70 backdrop-blur-md border border-white/[0.06] rounded-lg p-5 text-center select-none">
                <p className="text-sm font-medium text-white/50 mb-0.5">{bank.name}</p>
                <p className="text-[11px] text-white/15">{bank.type}</p>
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
    <Panel z={-68} range={12}>
      <Html position={[-3.2, 1, 0]} center distanceFactor={7}>
        <div data-panel-z="-68" className="w-[320px] select-none">
          <p className="text-[13px] text-white/20 tracking-widest uppercase mb-4">Security</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white/80 leading-snug mb-4">
            Your data stays yours
          </h2>
          <p className="text-[13px] text-white/25 leading-relaxed">
            No bank credentials stored. PII masked before AI processing. Row-level security isolates every account.
          </p>
        </div>
      </Html>
      {stats.map((item, i) => (
        <Float key={item.label} speed={0.6 + i * 0.2} rotationIntensity={0.02} floatIntensity={0.1}>
          <Html position={[2.8, 1.8 - i * 1.4, i * 0.5]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
            <div data-panel-z="-68" className="w-[300px] flex items-center justify-between bg-black/70 backdrop-blur-md border border-white/[0.06] rounded-lg px-5 py-3.5 select-none">
              <span className="text-[13px] text-white/25">{item.label}</span>
              <span className="text-[13px] font-medium text-white/60">{item.value}</span>
            </div>
          </Html>
        </Float>
      ))}
    </Panel>
  );
}

function CTAPanel() {
  return (
    <Panel z={-82} range={10}>
      <Float speed={1.2} rotationIntensity={0.06} floatIntensity={0.2}>
        <Html center distanceFactor={8} style={{ pointerEvents: 'auto' }}>
          <div data-panel-z="-82" className="w-[600px] text-center select-none">
            <h2 className="text-4xl font-semibold tracking-tight text-white/90 mb-4">
              Five minutes to clarity
            </h2>
            <p className="text-[13px] text-white/25 mb-10 max-w-sm mx-auto leading-relaxed">
              Upload your first statement. Get your unified portfolio. Start receiving daily briefings.
            </p>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-6 py-3 rounded-md hover:bg-white/90 transition-colors">
              Get Started <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </Html>
      </Float>
    </Panel>
  );
}

// ─── Scene assembly ──────────────────────────────────────────────────

function SceneContent() {
  return (
    <>
      <CameraRig />
      <fog attach="fog" args={['#030305', 3, 35]} />
      <ambientLight intensity={0.2} />
      <Stars radius={80} depth={100} count={2500} factor={3} saturation={0} fade speed={0.4} />
      <Particles count={1200} />
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
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <span className="text-sm font-semibold tracking-tight text-white/90">WealthDelta</span>
        <div className="flex items-center gap-1">
          <Link href="/login" className="text-[13px] text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5">Sign In</Link>
          <Link href="/signup" className="text-[13px] text-black font-medium bg-white hover:bg-white/90 transition-colors px-3.5 py-1.5 rounded-md">Get Started</Link>
        </div>
      </div>
    </header>
  );
}

function ScrollHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    const handler = () => setVisible(false);
    window.addEventListener('scroll', handler, { once: true });
    return () => { clearTimeout(timer); window.removeEventListener('scroll', handler); };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 animate-pulse">
      <span className="text-[11px] text-white/20 tracking-widest uppercase">Scroll to explore</span>
      <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────

export function LandingScene3D() {
  return (
    <div className="h-screen w-screen bg-[#030305]">
      <NavOverlay />
      <ScrollHint />
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60, near: 0.1, far: 200 }}
        style={{ position: 'fixed', inset: 0 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#030305']} />
        <ScrollControls pages={7} damping={0.2}>
          <SceneContent />
        </ScrollControls>
      </Canvas>
    </div>
  );
}
