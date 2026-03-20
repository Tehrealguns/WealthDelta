'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid';
import { HoldingsTable } from '@/components/holdings-table';
import { PortfolioSummaryCard } from '@/components/portfolio-summary-card';
import { SourceBreakdownCard } from '@/components/source-breakdown-card';
import { PortfolioChart } from '@/components/portfolio-chart';
import { AssetDonutChart } from '@/components/asset-donut-chart';
import { Settings, Check, ChevronDown } from 'lucide-react';
import type { HoldingRow } from '@/lib/types';
import { Decimal, formatCurrency } from '@/lib/decimal';

interface DashboardContentProps {
  holdings: HoldingRow[];
  userEmail: string;
  displayName: string;
  snapshotHistory: Array<{ date: string; value: number }>;
}

const ACCENT_OPTIONS = [
  { key: 'emerald', color: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { key: 'blue', color: 'bg-blue-500', ring: 'ring-blue-500' },
  { key: 'purple', color: 'bg-purple-500', ring: 'ring-purple-500' },
  { key: 'amber', color: 'bg-amber-500', ring: 'ring-amber-500' },
  { key: 'rose', color: 'bg-rose-500', ring: 'ring-rose-500' },
  { key: 'cyan', color: 'bg-cyan-500', ring: 'ring-cyan-500' },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const dashboardFeatures = [
  {
    name: 'Unified Portfolio',
    description: 'All holdings from every custodian aggregated into a single view.',
    href: '#holdings',
    cta: 'View Holdings',
    accentColor: 'bg-emerald-500',
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-transparent" />
    ),
    className: 'lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3',
  },
  {
    name: 'Daily Briefing',
    description: 'AI-generated narrative explaining why your portfolio value changed overnight.',
    href: '/briefing',
    cta: 'Open Briefing',
    accentColor: 'bg-blue-500',
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-transparent" />
    ),
    className: 'lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2',
  },
  {
    name: 'The Vault',
    description: 'Upload wealth statements from custodians without APIs. PDF extraction in seconds.',
    href: '/vault',
    cta: 'Open Vault',
    accentColor: 'bg-purple-500',
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] via-transparent to-transparent" />
    ),
    className: 'lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-3',
  },
  {
    name: 'Research Report',
    description: 'On-demand deep analysis with market context, risk flags, and allocation recommendations.',
    href: '/research',
    cta: 'Generate Report',
    accentColor: 'bg-amber-500',
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] via-transparent to-transparent" />
    ),
    className: 'lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2',
  },
  {
    name: 'Source Analytics',
    description: 'Wealth breakdown by source, asset class, and performance attribution over time.',
    href: '#',
    cta: 'View Breakdown',
    accentColor: 'bg-rose-500',
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] via-transparent to-transparent" />
    ),
    className: 'lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-3',
  },
];

function CollapsibleSection({
  title,
  storageKey,
  children,
  defaultOpen = true,
}: {
  title: string;
  storageKey: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return defaultOpen;
    const saved = localStorage.getItem(`wd-section-${storageKey}`);
    return saved !== null ? saved === 'true' : defaultOpen;
  });

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(`wd-section-${storageKey}`, String(next));
      return next;
    });
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 mb-3 group"
      >
        <ChevronDown
          className={`size-4 text-white/25 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
        <span className="text-xs font-medium text-white/30 uppercase tracking-wider group-hover:text-white/50 transition-colors">
          {title}
        </span>
        <div className="flex-1 h-px bg-white/[0.04]" />
      </button>
      {open && children}
    </div>
  );
}

export function DashboardContent({ holdings, userEmail, displayName, snapshotHistory }: DashboardContentProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accent, setAccent] = useState('emerald');
  const [compact, setCompact] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('wd-accent');
    if (saved) setAccent(saved);
    const savedCompact = localStorage.getItem('wd-compact');
    if (savedCompact === 'true') setCompact(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAccent = (key: string) => {
    setAccent(key);
    localStorage.setItem('wd-accent', key);
  };

  const handleCompact = () => {
    const next = !compact;
    setCompact(next);
    localStorage.setItem('wd-compact', String(next));
  };

  const lastUpdated = useMemo(() => {
    if (holdings.length === 0) return null;
    const dates = holdings
      .map((h) => new Date(h.updated_at).getTime())
      .filter((t) => !isNaN(t));
    if (dates.length === 0) return null;
    const latest = new Date(Math.max(...dates));
    const diff = Date.now() - latest.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Updated just now';
    if (hours < 24) return `Updated ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Updated ${days}d ago`;
  }, [holdings]);

  const portfolioDelta = useMemo(() => {
    if (snapshotHistory.length < 2) return null;
    const latest = snapshotHistory[snapshotHistory.length - 1].value;
    const prev = snapshotHistory[snapshotHistory.length - 2].value;
    const delta = latest - prev;
    const pct = prev > 0 ? (delta / prev) * 100 : 0;
    return { delta, pct, positive: delta >= 0 };
  }, [snapshotHistory]);

  const totalValue = holdings.reduce(
    (sum, h) => sum.plus(new Decimal(h.valuation_base)),
    new Decimal(0),
  );

  const firstName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return (
    <div className={`space-y-8 ${compact ? 'space-y-5' : ''}`}>
      {/* Greeting Bar */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {getGreeting()}, {firstName}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {portfolioDelta ? (
              <p className="text-sm text-white/35">
                Your portfolio is{' '}
                <span className={portfolioDelta.positive ? 'text-emerald-400' : 'text-rose-400'}>
                  {portfolioDelta.positive ? 'up' : 'down'} {Math.abs(portfolioDelta.pct).toFixed(2)}%
                </span>{' '}
                since yesterday
              </p>
            ) : (
              <p className="text-sm text-white/25">{userEmail}</p>
            )}
            {lastUpdated && (
              <span className="text-xs text-white/15">{lastUpdated}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/vault"
            className="inline-flex items-center rounded-md border border-white/[0.08] px-3 py-1.5 text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            Upload Statements
          </Link>
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="inline-flex items-center justify-center rounded-md border border-white/[0.08] p-1.5 text-white/30 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Settings className="size-4" />
            </button>
            {settingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-white/[0.08] bg-[#111] p-3 shadow-2xl z-50">
                <p className="text-[11px] text-white/30 tracking-widest uppercase mb-2">Accent</p>
                <div className="flex gap-1.5 mb-3">
                  {ACCENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleAccent(opt.key)}
                      className={`h-5 w-5 rounded-full ${opt.color} transition-all ${accent === opt.key ? 'ring-2 ring-offset-2 ring-offset-[#111] ' + opt.ring : 'opacity-50 hover:opacity-100'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCompact}
                  className="flex items-center justify-between w-full text-xs text-white/50 hover:text-white transition-colors py-1"
                >
                  <span>Compact mode</span>
                  <span className={`inline-flex items-center justify-center h-4 w-4 rounded border ${compact ? 'bg-white/10 border-white/30' : 'border-white/10'}`}>
                    {compact && <Check className="size-2.5 text-white" />}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CollapsibleSection title="Overview" storageKey="overview">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PortfolioSummaryCard holdings={holdings} />
          <SourceBreakdownCard holdings={holdings} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Charts" storageKey="charts">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PortfolioChart data={snapshotHistory} />
          <AssetDonutChart holdings={holdings} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Quick Access" storageKey="bento">
        <BentoGrid className="lg:grid-rows-2 auto-rows-[14rem]">
          {dashboardFeatures.map((feature) => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </CollapsibleSection>

      <CollapsibleSection title="Holdings" storageKey="holdings">
        <div id="holdings">
          <HoldingsTable data={holdings} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
