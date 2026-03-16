'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid';
import { HoldingsTable } from '@/components/holdings-table';
import { PortfolioSummaryCard } from '@/components/portfolio-summary-card';
import { SourceBreakdownCard } from '@/components/source-breakdown-card';
import type { HoldingRow } from '@/lib/types';

interface DashboardContentProps {
  holdings: HoldingRow[];
  userEmail: string;
}

const dashboardFeatures = [
  {
    name: 'Unified Portfolio',
    description:
      'All holdings from UBS, JBWere, Stonehage Fleming, and Bell Potter aggregated into a single view.',
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
    description:
      'AI-generated narrative explaining why your portfolio value changed overnight.',
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
    description:
      'Upload wealth statements from custodians without APIs. PDF extraction in seconds.',
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
    description:
      'On-demand deep analysis with market context, risk flags, and allocation recommendations.',
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
    description:
      'Wealth breakdown by source, asset class, and performance attribution over time.',
    href: '#',
    cta: 'View Breakdown',
    accentColor: 'bg-rose-500',
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] via-transparent to-transparent" />
    ),
    className: 'lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-3',
  },
];

export function DashboardContent({ holdings, userEmail }: DashboardContentProps) {
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Dashboard
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-white/25 text-sm">{userEmail}</p>
            {lastUpdated && (
              <span className="text-xs text-white/15">{lastUpdated}</span>
            )}
          </div>
        </div>
        <Link
          href="/setup"
          className="inline-flex items-center rounded-md border border-white/[0.08] px-3 py-1.5 text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          Upload Statements
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PortfolioSummaryCard holdings={holdings} />
        <SourceBreakdownCard holdings={holdings} />
      </div>

      <BentoGrid className="lg:grid-rows-2 auto-rows-[14rem]">
        {dashboardFeatures.map((feature) => (
          <BentoCard key={feature.name} {...feature} />
        ))}
      </BentoGrid>

      <div id="holdings">
        <HoldingsTable data={holdings} />
      </div>
    </div>
  );
}
