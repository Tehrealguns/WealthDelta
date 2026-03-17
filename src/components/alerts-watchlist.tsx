'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Bell,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  Save,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/decimal';
import type { HoldingRow } from '@/lib/types';

interface QuoteData {
  price: number | null;
  change: number | null;
  changePct: number | null;
  currency: string | null;
  name: string | null;
}

interface AlertsWatchlistProps {
  holdings: HoldingRow[];
  watchItems: string;
}

export function AlertsWatchlist({ holdings, watchItems: initialWatchItems }: AlertsWatchlistProps) {
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [loading, setLoading] = useState(false);
  const [watchItems, setWatchItems] = useState(initialWatchItems);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  const tickers = useMemo(
    () => [...new Set(holdings.map((h) => h.ticker_symbol).filter((t): t is string => t != null && t.length > 0))],
    [holdings],
  );

  useEffect(() => {
    async function fetchQuotes() {
      if (tickers.length === 0) return;
      setLoading(true);
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
      setLoading(false);
    }
    fetchQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchList = useMemo(
    () => watchItems.split('\n').map((s) => s.trim()).filter(Boolean),
    [watchItems],
  );

  const significantMovers = useMemo(() => {
    return holdings
      .filter((h) => {
        if (!h.ticker_symbol || !quotes[h.ticker_symbol]) return false;
        const q = quotes[h.ticker_symbol];
        return q.changePct != null && Math.abs(q.changePct) >= 2;
      })
      .map((h) => ({
        holding: h,
        quote: quotes[h.ticker_symbol!],
      }))
      .sort((a, b) => Math.abs(b.quote.changePct!) - Math.abs(a.quote.changePct!));
  }, [holdings, quotes]);

  const concentrationAlerts = useMemo(() => {
    const total = holdings.reduce((s, h) => s + h.valuation_base, 0);
    return holdings
      .filter((h) => total > 0 && (h.valuation_base / total) * 100 > 10)
      .map((h) => ({
        holding: h,
        pct: total > 0 ? (h.valuation_base / total) * 100 : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [holdings]);

  function addWatchItem() {
    if (!newItem.trim()) return;
    const updated = watchList.length > 0
      ? `${watchItems}\n${newItem.trim()}`
      : newItem.trim();
    setWatchItems(updated);
    setNewItem('');
  }

  function removeWatchItem(index: number) {
    const items = watchList.filter((_, i) => i !== index);
    setWatchItems(items.join('\n'));
  }

  async function saveWatchItems() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watch_items: watchItems }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Watch list saved');
    } catch {
      toast.error('Failed to save watch list');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Alerts & Watchlist
        </h1>
        <p className="text-white/25 text-sm mt-1">
          Monitor positions, set alerts, and track what matters.
        </p>
      </div>

      {/* Active Alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Significant Movers */}
        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase flex items-center gap-2">
              <Bell className="size-3.5" />
              Significant Moves (&ge;2%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 text-white/20 animate-spin" />
              </div>
            ) : significantMovers.length === 0 ? (
              <p className="text-sm text-white/20 py-6 text-center">
                No significant moves today
              </p>
            ) : (
              <div className="space-y-2">
                {significantMovers.map((m) => {
                  const up = (m.quote.changePct ?? 0) >= 0;
                  return (
                    <div
                      key={m.holding.id}
                      className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {up ? (
                            <TrendingUp className="size-3.5 text-emerald-400/60 shrink-0" />
                          ) : (
                            <TrendingDown className="size-3.5 text-rose-400/60 shrink-0" />
                          )}
                          <span className="text-sm text-white/50 truncate">
                            {m.holding.asset_name}
                          </span>
                        </div>
                        <span className="text-xs text-white/20 font-mono ml-5">
                          {m.holding.ticker_symbol}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-mono ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {up ? '+' : ''}{m.quote.changePct?.toFixed(2)}%
                        </p>
                        {m.quote.price != null && (
                          <p className="text-xs text-white/20 font-mono">
                            ${m.quote.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Concentration Alerts */}
        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              Concentration Alerts (&gt;10%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {concentrationAlerts.length === 0 ? (
              <p className="text-sm text-white/20 py-6 text-center">
                No concentration risks detected
              </p>
            ) : (
              <div className="space-y-2">
                {concentrationAlerts.map((a) => (
                  <div
                    key={a.holding.id}
                    className="flex items-center justify-between rounded-xl border border-amber-500/10 bg-amber-500/[0.02] p-4"
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-white/50 truncate block">
                        {a.holding.asset_name}
                      </span>
                      <span className="text-xs text-white/20">{a.holding.source}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono text-amber-400/70">
                        {a.pct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-white/20 font-mono">
                        {formatCurrency(a.holding.valuation_base)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Watch List */}
      <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase flex items-center gap-2">
            <Eye className="size-3.5" />
            Watch List
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={saveWatchItems}
            disabled={saving}
            className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5"
          >
            {saving ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="size-3.5 mr-1.5" />
            )}
            Save
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-white/20">
            Items here are flagged in every daily briefing. Add positions to monitor, price targets, or events to track.
          </p>

          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWatchItem()}
              placeholder="e.g. BHP nearing stop-loss at $38, track USD/AUD at 0.65..."
              className="flex-1 rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-2.5 text-sm text-white/60 placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-white/10"
            />
            <Button
              onClick={addWatchItem}
              disabled={!newItem.trim()}
              className="bg-white/10 text-white/60 hover:bg-white/15 border border-white/[0.06]"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {watchList.length > 0 ? (
            <div className="space-y-1">
              {watchList.map((item, i) => (
                <div
                  key={`${item}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 group"
                >
                  <span className="text-sm text-white/40">{item}</span>
                  <button
                    onClick={() => removeWatchItem(i)}
                    className="text-white/10 hover:text-white/40 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/15 text-center py-4">
              No items on your watch list yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
