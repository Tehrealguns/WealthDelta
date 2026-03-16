'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, Decimal } from '@/lib/decimal';
import type { HoldingRow } from '@/lib/types';

interface PortfolioSummaryCardProps {
  holdings: HoldingRow[];
}

export function PortfolioSummaryCard({ holdings }: PortfolioSummaryCardProps) {
  const totalValue = holdings.reduce(
    (sum, h) => sum.plus(new Decimal(h.valuation_base)),
    new Decimal(0),
  );

  const assetCount = holdings.length;
  const sourceCount = new Set(holdings.map((h) => h.source)).size;

  return (
    <Card className="border-white/[0.06] bg-[#0a0a0a]">
      <CardHeader>
        <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
          Total Portfolio Value
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-4xl font-bold tracking-tight text-white">
          {assetCount > 0 ? formatCurrency(totalValue) : '—'}
        </p>
        <div className="flex gap-6 text-sm text-white/30">
          <div>
            <span className="text-2xl font-semibold text-white">{assetCount}</span>
            <p>Assets</p>
          </div>
          <div>
            <span className="text-2xl font-semibold text-white">{sourceCount}</span>
            <p>Sources</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
