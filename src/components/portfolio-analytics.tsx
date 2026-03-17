'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/decimal';
import type { HoldingRow, DailySnapshotRow } from '@/lib/types';

interface QuoteData {
  price: number | null;
  change: number | null;
  changePct: number | null;
  currency: string | null;
  name: string | null;
}

interface PortfolioAnalyticsProps {
  holdings: HoldingRow[];
  snapshots: DailySnapshotRow[];
}

const PALETTE = [
  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-lime-500', 'bg-orange-500',
];

export function PortfolioAnalytics({ holdings, snapshots }: PortfolioAnalyticsProps) {
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const tickers = useMemo(
    () => [...new Set(holdings.map((h) => h.ticker_symbol).filter((t): t is string => t != null && t.length > 0))],
    [holdings],
  );

  async function fetchQuotes() {
    if (tickers.length === 0) return;
    setLoadingQuotes(true);
    try {
      const res = await fetch('/api/market/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: tickers }),
      });
      if (res.ok) {
        const data = (await res.json()) as { quotes: Record<string, QuoteData> };
        setQuotes(data.quotes);
      }
    } catch { /* silently fail */ }
    setLoadingQuotes(false);
  }

  useEffect(() => {
    fetchQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalValue = useMemo(
    () => holdings.reduce((sum, h) => sum + h.valuation_base, 0),
    [holdings],
  );

  const byClass = useMemo(() => {
    const map: Record<string, { value: number; count: number }> = {};
    for (const h of holdings) {
      if (!map[h.asset_class]) map[h.asset_class] = { value: 0, count: 0 };
      map[h.asset_class].value += h.valuation_base;
      map[h.asset_class].count += 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].value - a[1].value);
  }, [holdings]);

  const bySource = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of holdings) {
      map[h.source] = (map[h.source] ?? 0) + h.valuation_base;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [holdings]);

  const topMovers = useMemo(() => {
    return holdings
      .filter((h) => h.ticker_symbol && quotes[h.ticker_symbol]?.changePct != null)
      .map((h) => ({
        ...h,
        quote: quotes[h.ticker_symbol!],
      }))
      .sort((a, b) => Math.abs(b.quote.changePct!) - Math.abs(a.quote.changePct!))
      .slice(0, 8);
  }, [holdings, quotes]);

  const topConcentrations = useMemo(() => {
    return holdings
      .filter((h) => h.valuation_base > 0)
      .sort((a, b) => b.valuation_base - a.valuation_base)
      .slice(0, 10);
  }, [holdings]);

  const latestSnapshot = snapshots[0] ?? null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Portfolio Analytics
          </h1>
          <p className="text-white/25 text-sm mt-1">
            {holdings.length} holdings across {bySource.length} custodian{bySource.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchQuotes}
          disabled={loadingQuotes || tickers.length === 0}
          className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5"
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${loadingQuotes ? 'animate-spin' : ''}`} />
          Refresh Prices
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-white/25 uppercase tracking-widest mb-2">Total Value</p>
            <p className="text-2xl font-semibold text-white tracking-tight">
              {formatCurrency(totalValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-white/25 uppercase tracking-widest mb-2">Daily Change</p>
            {latestSnapshot?.delta_value != null ? (
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-semibold tracking-tight ${latestSnapshot.delta_value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {latestSnapshot.delta_value >= 0 ? '+' : ''}{formatCurrency(latestSnapshot.delta_value)}
                </p>
                {latestSnapshot.delta_value >= 0 ? (
                  <TrendingUp className="size-4 text-emerald-400/60" />
                ) : (
                  <TrendingDown className="size-4 text-rose-400/60" />
                )}
              </div>
            ) : (
              <p className="text-2xl font-semibold text-white/20 tracking-tight">—</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-white/25 uppercase tracking-widest mb-2">Asset Classes</p>
            <p className="text-2xl font-semibold text-white tracking-tight">
              {byClass.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-white/25 uppercase tracking-widest mb-2">Live Prices</p>
            <p className="text-2xl font-semibold text-white tracking-tight">
              {Object.keys(quotes).length}
              <span className="text-sm text-white/20 font-normal ml-1">/ {tickers.length}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Asset Class Breakdown */}
        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase flex items-center gap-2">
              <PieChart className="size-3.5" />
              Allocation by Class
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byClass.map(([cls, data], i) => {
              const pct = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
              return (
                <div key={cls}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`size-2 rounded-full ${PALETTE[i % PALETTE.length]}`} />
                      <span className="text-sm text-white/50">{cls}</span>
                      <span className="text-xs text-white/15">{data.count}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/20 font-mono">{pct.toFixed(1)}%</span>
                      <span className="text-sm text-white/40 font-mono">{formatCurrency(data.value)}</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${PALETTE[i % PALETTE.length]} opacity-40`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Source Breakdown */}
        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase flex items-center gap-2">
              <BarChart3 className="size-3.5" />
              Allocation by Custodian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bySource.map(([source, value], i) => {
              const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
              return (
                <div key={source}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`size-2 rounded-full ${PALETTE[i % PALETTE.length]}`} />
                      <span className="text-sm text-white/50">{source}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/20 font-mono">{pct.toFixed(1)}%</span>
                      <span className="text-sm text-white/40 font-mono">{formatCurrency(value)}</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${PALETTE[i % PALETTE.length]} opacity-40`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Top Movers */}
      {topMovers.length > 0 && (
        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase flex items-center gap-2">
              <Activity className="size-3.5" />
              Today&apos;s Movers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {topMovers.map((m) => {
                const up = (m.quote.changePct ?? 0) >= 0;
                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-white/50">{m.ticker_symbol}</span>
                      <span className={`text-xs font-mono ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {up ? '+' : ''}{m.quote.changePct?.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-[13px] text-white/30 truncate">{m.asset_name}</p>
                    {m.quote.price != null && (
                      <p className="text-sm text-white/50 font-mono mt-1">
                        ${m.quote.price.toFixed(2)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Concentration Risk */}
      <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
            Top 10 Concentrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topConcentrations.map((h) => {
              const pct = totalValue > 0 ? (h.valuation_base / totalValue) * 100 : 0;
              const isRisk = pct > 10;
              return (
                <div key={h.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-white/50 truncate">{h.asset_name}</span>
                      {h.ticker_symbol && (
                        <span className="text-xs text-white/20 font-mono shrink-0">{h.ticker_symbol}</span>
                      )}
                      {isRisk && (
                        <span className="text-[10px] text-amber-400/70 border border-amber-400/20 rounded px-1 shrink-0">
                          HIGH
                        </span>
                      )}
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isRisk ? 'bg-amber-500' : 'bg-white'} opacity-30`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-32">
                    <span className="text-sm text-white/40 font-mono">{formatCurrency(h.valuation_base)}</span>
                    <span className="text-xs text-white/20 font-mono ml-2">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
