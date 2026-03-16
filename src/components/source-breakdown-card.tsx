'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, Decimal } from '@/lib/decimal';
import type { HoldingRow } from '@/lib/types';

interface SourceBreakdownCardProps {
  holdings: HoldingRow[];
}

const COLOR_PALETTE = [
  { text: 'text-emerald-400', dot: 'bg-emerald-400' },
  { text: 'text-blue-400', dot: 'bg-blue-400' },
  { text: 'text-purple-400', dot: 'bg-purple-400' },
  { text: 'text-amber-400', dot: 'bg-amber-400' },
  { text: 'text-rose-400', dot: 'bg-rose-400' },
  { text: 'text-cyan-400', dot: 'bg-cyan-400' },
  { text: 'text-indigo-400', dot: 'bg-indigo-400' },
  { text: 'text-teal-400', dot: 'bg-teal-400' },
];

export function SourceBreakdownCard({ holdings }: SourceBreakdownCardProps) {
  const bySource = useMemo(() => {
    const sources = [...new Set(holdings.map((h) => h.source))].sort();
    return sources.map((source) => {
      const sourceHoldings = holdings.filter((h) => h.source === source);
      const total = sourceHoldings.reduce(
        (sum, h) => sum.plus(new Decimal(h.valuation_base)),
        new Decimal(0),
      );
      return { source, total, count: sourceHoldings.length };
    });
  }, [holdings]);

  const grandTotal = bySource.reduce((sum, s) => sum.plus(s.total), new Decimal(0));

  return (
    <Card className="border-white/[0.06] bg-[#0a0a0a]">
      <CardHeader>
        <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
          By Source
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bySource.length === 0 ? (
          <p className="text-white/15 text-sm">No data yet.</p>
        ) : (
          bySource.map(({ source, total, count }, i) => {
            const colors = COLOR_PALETTE[i % COLOR_PALETTE.length];
            const pct = grandTotal.isZero()
              ? '0'
              : total.div(grandTotal).times(100).toFixed(1);
            return (
              <div key={source} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-medium ${colors.text}`}>{source}</span>
                  <span className="text-xs text-white/15">{count} assets</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono tabular-nums text-white/70">
                    {formatCurrency(total)}
                  </p>
                  <p className="text-xs text-white/20">{pct}%</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
