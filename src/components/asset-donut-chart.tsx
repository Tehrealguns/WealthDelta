'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Decimal } from '@/lib/decimal';
import type { HoldingRow } from '@/lib/types';

const COLORS = ['#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#fb7185', '#22d3ee', '#818cf8', '#2dd4bf'];

interface AssetDonutChartProps {
  holdings: HoldingRow[];
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function AssetDonutChart({ holdings }: AssetDonutChartProps) {
  const data = useMemo(() => {
    const classes = [...new Set(holdings.map((h) => h.asset_class))].sort();
    return classes.map((cls) => {
      const total = holdings
        .filter((h) => h.asset_class === cls)
        .reduce((sum, h) => sum.plus(new Decimal(h.valuation_base)), new Decimal(0));
      return { name: cls, value: total.toNumber() };
    });
  }, [holdings]);

  if (data.length === 0) {
    return (
      <Card className="border-white/[0.06] bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
            Asset Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/15 text-sm">No data yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/[0.06] bg-[#0a0a0a]">
      <CardHeader>
        <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
          Asset Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#111',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.7)',
                  }}
                  formatter={(v: number) => formatCompact(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            {data.map((item, i) => {
              const total = data.reduce((s, d) => s + d.value, 0);
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
              return (
                <div key={item.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-xs text-white/50 truncate">{item.name}</span>
                  </div>
                  <span className="text-xs font-mono text-white/30 shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
