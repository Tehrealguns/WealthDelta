'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type HoldingRow } from '@/lib/types';
import { formatCurrency } from '@/lib/decimal';
import { ChevronDown, Lock, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SOURCE_PALETTE = [
  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'text-rose-400 bg-rose-400/10 border-rose-400/20',
  'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  'text-teal-400 bg-teal-400/10 border-teal-400/20',
];

const CLASS_PALETTE: Record<string, string> = {
  Equity: 'text-emerald-400',
  Bond: 'text-blue-400',
  Cash: 'text-amber-400',
  Alternative: 'text-purple-400',
  'Private Equity': 'text-rose-400',
};

interface HoldingsTableProps {
  data: HoldingRow[];
}

interface GroupedData {
  source: string;
  sourceTotal: number;
  holdingCount: number;
  classes: {
    className: string;
    classTotal: number;
    holdings: HoldingRow[];
  }[];
}

export function HoldingsTable({ data }: HoldingsTableProps) {
  const router = useRouter();
  const [deletingSource, setDeletingSource] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function deleteSource(source: string) {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/holdings/source', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Failed to delete');
      toast.success(`Deleted ${result.deleted} holdings from ${source}`);
      setDeletingSource(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  }

  const grouped = useMemo<GroupedData[]>(() => {
    const bySource = new Map<string, HoldingRow[]>();
    for (const h of data) {
      const existing = bySource.get(h.source) ?? [];
      existing.push(h);
      bySource.set(h.source, existing);
    }

    return [...bySource.entries()]
      .map(([source, holdings]) => {
        const byClass = new Map<string, HoldingRow[]>();
        for (const h of holdings) {
          const existing = byClass.get(h.asset_class) ?? [];
          existing.push(h);
          byClass.set(h.asset_class, existing);
        }

        const classes = [...byClass.entries()]
          .map(([className, classHoldings]) => ({
            className,
            classTotal: classHoldings.reduce((s, h) => s + Number(h.valuation_base), 0),
            holdings: classHoldings.sort((a, b) => Number(b.valuation_base) - Number(a.valuation_base)),
          }))
          .sort((a, b) => b.classTotal - a.classTotal);

        return {
          source,
          sourceTotal: holdings.reduce((s, h) => s + Number(h.valuation_base), 0),
          holdingCount: holdings.length,
          classes,
        };
      })
      .sort((a, b) => b.sourceTotal - a.sourceTotal);
  }, [data]);

  const allSources = useMemo(() => grouped.map((g) => g.source), [grouped]);

  const [collapsedSources, setCollapsedSources] = useState<Set<string>>(new Set());
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set());

  function toggleSource(source: string) {
    setCollapsedSources((prev) => {
      const next = new Set(prev);
      next.has(source) ? next.delete(source) : next.add(source);
      return next;
    });
  }

  function toggleClass(key: string) {
    setCollapsedClasses((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (data.length === 0) {
    return (
      <Card className="border-white/[0.06] bg-[#0a0a0a]">
        <CardContent className="py-16 text-center text-white/20 text-sm">
          No holdings yet. Upload statements to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/[0.06] bg-[#0a0a0a]">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-white/40 tracking-wide uppercase">
          Holdings · {data.length} assets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {grouped.map((group) => {
          const sourceIdx = allSources.indexOf(group.source);
          const sourceStyle = SOURCE_PALETTE[sourceIdx % SOURCE_PALETTE.length];
          const isSourceOpen = !collapsedSources.has(group.source);

          return (
            <div key={group.source} className="rounded-xl border border-white/[0.06] overflow-hidden">
              {/* Source header */}
              {deletingSource === group.source ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03]">
                  <p className="flex-1 text-xs text-white/50">
                    Delete all <span className="text-red-400/80 font-medium">{group.holdingCount} holdings</span> from <span className="text-white/70 font-medium">{group.source}</span>?
                  </p>
                  <button
                    onClick={() => deleteSource(group.source)}
                    disabled={deleteLoading}
                    className="inline-flex items-center rounded-md bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Trash2 className="size-3 mr-1" />}
                    Delete
                  </button>
                  <button
                    onClick={() => setDeletingSource(null)}
                    disabled={deleteLoading}
                    className="rounded-md px-2.5 py-1 text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
              <div className="flex items-center bg-white/[0.03] hover:bg-white/[0.05] transition-colors group/source">
                <button
                  onClick={() => toggleSource(group.source)}
                  className="flex flex-1 items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${sourceStyle}`}>
                      {group.source}
                    </span>
                    <span className="text-xs text-white/30">
                      {group.holdingCount} holding{group.holdingCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm tabular-nums text-white/70">
                      {formatCurrency(group.sourceTotal)}
                    </span>
                    <ChevronDown
                      className={`size-4 text-white/25 transition-transform duration-200 ${isSourceOpen ? '' : '-rotate-90'}`}
                    />
                  </div>
                </button>
                <button
                  onClick={() => setDeletingSource(group.source)}
                  className="mr-3 p-1.5 rounded-md text-white/10 hover:text-red-400/60 hover:bg-red-500/10 transition-colors opacity-0 group-hover/source:opacity-100"
                  title="Delete source"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              )}

              {/* Asset class groups */}
              {isSourceOpen && (
                <div className="divide-y divide-white/[0.04]">
                  {group.classes.map((cls) => {
                    const classKey = `${group.source}:${cls.className}`;
                    const isClassOpen = !collapsedClasses.has(classKey);
                    const classColor = CLASS_PALETTE[cls.className] ?? 'text-white/50';

                    return (
                      <div key={classKey}>
                        {/* Asset class sub-header */}
                        <button
                          onClick={() => toggleClass(classKey)}
                          className="flex w-full items-center justify-between px-4 py-2.5 pl-8 bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${classColor}`}>
                              {cls.className}
                            </span>
                            <span className="text-[11px] text-white/20">
                              {cls.holdings.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs tabular-nums text-white/50">
                              {formatCurrency(cls.classTotal)}
                            </span>
                            <ChevronDown
                              className={`size-3.5 text-white/20 transition-transform duration-200 ${isClassOpen ? '' : '-rotate-90'}`}
                            />
                          </div>
                        </button>

                        {/* Holdings rows */}
                        {isClassOpen && (
                          <div className="divide-y divide-white/[0.03]">
                            {cls.holdings.map((h) => (
                              <div
                                key={h.id}
                                className="flex items-center gap-3 px-4 py-2 pl-12 hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white/80 truncate">{h.asset_name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {h.ticker_symbol && (
                                      <span className="font-mono text-[11px] text-white/40">
                                        {h.ticker_symbol}
                                      </span>
                                    )}
                                    {h.quantity != null && (
                                      <span className="text-[11px] text-white/25">
                                        {Number(h.quantity).toLocaleString()} units
                                      </span>
                                    )}
                                    {h.is_static && <Lock className="size-3 text-white/15" />}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-mono text-sm tabular-nums text-white/80">
                                    {formatCurrency(h.valuation_base)}
                                  </p>
                                  <p className="text-[11px] text-white/25 mt-0.5">
                                    {h.currency} · {h.valuation_date}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
