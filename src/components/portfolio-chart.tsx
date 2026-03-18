'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PortfolioChartProps {
  data: Array<{ date: string; value: number }>;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const change = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const delta = last - first;
    const pct = first > 0 ? (delta / first) * 100 : 0;
    return { delta, pct, positive: delta >= 0 };
  }, [data]);

  if (data.length === 0) {
    return (
      <Card className="border-white/[0.06] bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
            Portfolio Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/15 text-sm">Generate a snapshot to see your portfolio chart.</p>
        </CardContent>
      </Card>
    );
  }

  const gradientColor = change?.positive !== false ? '#34d399' : '#f87171';

  return (
    <Card className="border-white/[0.06] bg-[#0a0a0a]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
          Portfolio Value
        </CardTitle>
        {change && (
          <span className={`text-xs font-mono ${change.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {change.positive ? '+' : ''}{change.pct.toFixed(2)}%
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradientColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={gradientColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCompact}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.7)',
                }}
                formatter={(v: number) => [formatCompact(v), 'Value']}
                labelFormatter={(l: string) => new Date(l).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={gradientColor}
                strokeWidth={1.5}
                fill="url(#portfolioGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
