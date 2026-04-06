'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Upload,
  FileUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Plus,
  Trash2,
  ChevronDown,
  PlusCircle,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import type { HoldingRow } from '@/lib/types';
import { formatCurrency } from '@/lib/decimal';

interface VaultContentProps {
  staticHoldings: HoldingRow[];
}

interface VaultFile {
  file: File;
  description: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  count: number;
  error?: string;
  streamText: string;
  streamCollapsed: boolean;
}

type UploadMode = 'new' | 'add' | 'replace';

interface RecalcItem {
  asset_name: string;
  source: string;
  ticker: string | null;
  base_value: number;
  live_value_aud: number | null;
  effective_value: number;
  price_currency: string | null;
  fx_rate: number | null;
  fx_failed: boolean;
  stale: boolean;
  day_change_pct: number | null;
}

interface RecalcResult {
  total_value: number;
  holdings_count: number;
  stale_count: number;
  fx_fail_count: number;
  warnings: string[];
  items: RecalcItem[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VaultContent({ staticHoldings }: VaultContentProps) {
  const router = useRouter();
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [mode, setMode] = useState<UploadMode>('new');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [deletingSource, setDeletingSource] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<RecalcResult | null>(null);

  const existingSources = [...new Set(staticHoldings.map((h) => h.source))].sort();

  const holdingsBySource = existingSources.map((source) => {
    const holdings = staticHoldings.filter((h) => h.source === source);
    const total = holdings.reduce((s, h) => s + Number(h.valuation_base), 0);
    return { source, count: holdings.length, total };
  });

  function switchMode(newMode: UploadMode) {
    setMode(newMode);
    if (newMode === 'new') {
      setSelectedSource(null);
      setSourceName('');
    } else if (existingSources[0] && !selectedSource) {
      setSelectedSource(existingSources[0]);
      setSourceName(existingSources[0]);
    }
  }

  function selectSource(source: string) {
    setSelectedSource(source);
    setSourceName(source);
  }

  function addFiles(fileList: FileList) {
    const newFiles = Array.from(fileList);
    if (newFiles.length === 0) return;
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((file) => ({
        file,
        description: '',
        status: 'pending' as const,
        count: 0,
        streamText: '',
        streamCollapsed: false,
      })),
    ]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateDescription(idx: number, description: string) {
    setFiles((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, description } : f)),
    );
  }

  function updateFile(idx: number, patch: Partial<VaultFile>) {
    setFiles((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    );
  }

  function toggleStreamCollapsed(idx: number) {
    setFiles((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, streamCollapsed: !f.streamCollapsed } : f)),
    );
  }

  async function processFile(idx: number) {
    const f = files[idx];
    updateFile(idx, { status: 'uploading', streamText: '', streamCollapsed: false });

    const formData = new FormData();
    formData.append('file', f.file);
    formData.append('fileName', f.file.name);
    if (sourceName.trim()) formData.append('portfolioName', sourceName.trim());
    if (f.description) formData.append('description', f.description);
    // Only send replaceSource on the first file when in replace mode
    if (mode === 'replace' && selectedSource && idx === 0) {
      formData.append('replaceSource', selectedSource);
    }

    try {
      const res = await fetch('/api/setup/upload', { method: 'POST', body: formData });
      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              text?: string;
              count?: number;
              message?: string;
            };

            if (event.type === 'token' && event.text) {
              accumulated += event.text;
              updateFile(idx, { streamText: accumulated });
            } else if (event.type === 'done') {
              updateFile(idx, { status: 'done', count: event.count ?? 0, streamText: accumulated });
              // Auto-collapse after a short delay
              setTimeout(() => updateFile(idx, { streamCollapsed: true }), 1500);
              return event.count ?? 0;
            } else if (event.type === 'error') {
              updateFile(idx, { status: 'error', error: event.message ?? 'Failed', streamText: accumulated });
              setTimeout(() => updateFile(idx, { streamCollapsed: true }), 1500);
              return 0;
            }
          } catch { /* skip malformed */ }
        }
      }

      updateFile(idx, { status: 'error', error: 'Stream ended unexpectedly' });
      return 0;
    } catch (err) {
      updateFile(idx, { status: 'error', error: err instanceof Error ? err.message : 'Failed' });
      return 0;
    }
  }

  async function processAll() {
    if (files.length === 0) return;
    setProcessing(true);
    let total = 0;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;
      total += await processFile(i);
    }

    setProcessing(false);
    if (total > 0) {
      toast.success(`Extracted ${total} holdings`);
      router.refresh();
    }
  }

  async function deleteSource(source: string) {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/holdings/source', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      toast.success(`Deleted ${data.deleted} holdings from ${source}`);
      setDeletingSource(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function recalculate() {
    setRecalculating(true);
    setRecalcResult(null);
    try {
      const res = await fetch('/api/holdings/recalculate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Recalculation failed');
      setRecalcResult(data as RecalcResult);
      if (data.warnings?.length > 0) {
        toast.warning(data.warnings.join('. '));
      } else {
        toast.success(`Portfolio: ${formatCurrency(data.total_value)} across ${data.holdings_count} holdings`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  }

  const anyPending = files.some((f) => f.status === 'pending');
  const allDone = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">The Vault</h1>
        <p className="text-white/35 text-sm mt-1">
          Upload statements to add or update your portfolio holdings.
        </p>
      </div>

      {/* Upload section */}
      <Card className="border-white/[0.06] bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
            Upload Statements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mode selector: new / add to / replace */}
          {existingSources.length > 0 && (
            <div className="space-y-3">
              <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
                <button
                  onClick={() => switchMode('new')}
                  className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
                    mode === 'new'
                      ? 'bg-white/[0.08] text-white/80'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                  }`}
                >
                  <Plus className="size-3 inline mr-1 -mt-px" />
                  New Source
                </button>
                <button
                  onClick={() => switchMode('add')}
                  className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors border-l border-white/[0.08] ${
                    mode === 'add'
                      ? 'bg-white/[0.08] text-white/80'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                  }`}
                >
                  <PlusCircle className="size-3 inline mr-1 -mt-px" />
                  Add to Source
                </button>
                <button
                  onClick={() => switchMode('replace')}
                  className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors border-l border-white/[0.08] ${
                    mode === 'replace'
                      ? 'bg-white/[0.08] text-white/80'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                  }`}
                >
                  <RefreshCw className="size-3 inline mr-1 -mt-px" />
                  Replace Source
                </button>
              </div>

              {/* Source selector for add/replace modes */}
              {(mode === 'add' || mode === 'replace') && (
                <div className="flex flex-wrap gap-1.5">
                  {existingSources.map((s) => (
                    <button
                      key={s}
                      onClick={() => selectSource(s)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        selectedSource === s
                          ? mode === 'replace'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:border-white/15 hover:text-white/60'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Source name input for new source */}
          {mode === 'new' && (
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Portfolio / Source Name</label>
              <Input
                placeholder="e.g. UBS Private Banking, Macquarie Wrap"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="border-white/10 bg-white/[0.06] text-white placeholder:text-white/25 focus:border-white/20 h-10"
              />
            </div>
          )}

          {/* Mode descriptions */}
          {mode === 'add' && selectedSource && (
            <p className="text-xs text-white/30">
              New holdings will be <span className="text-emerald-400/70 font-medium">added</span> to <span className="text-emerald-400/70 font-medium">{selectedSource}</span>. Existing assets will be updated.
            </p>
          )}
          {mode === 'replace' && selectedSource && (
            <p className="text-xs text-white/30">
              All holdings from <span className="text-amber-400/70 font-medium">{selectedSource}</span> will be <span className="text-amber-400/70 font-medium">replaced</span> with the new data.
            </p>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all ${
              dragOver
                ? 'border-white/25 bg-white/[0.04]'
                : 'border-white/[0.08] hover:border-white/15'
            }`}
          >
            <Upload className="size-7 text-white/15 mb-3" />
            <p className="text-sm text-white/40 mb-1">Drop files here</p>
            <p className="text-xs text-white/20 mb-4">PDFs, CSVs, screenshots — anything with financial data</p>
            <label>
              <input
                type="file"
                accept=".pdf,.csv,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.txt"
                multiple
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <span className="inline-flex items-center rounded-md border border-white/[0.10] px-3 py-1.5 text-sm font-medium text-white/40 hover:text-white/60 hover:bg-white/5 cursor-pointer transition-colors">
                <FileUp className="size-3.5 mr-1.5" /> Browse Files
              </span>
            </label>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div
                  key={`${f.file.name}-${i}`}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/60 truncate">
                        {f.file.name}
                        <span className="ml-2 text-white/25 text-xs">{formatFileSize(f.file.size)}</span>
                      </p>
                      <p className="text-xs mt-0.5">
                        {f.status === 'pending' && <span className="text-white/30">Ready</span>}
                        {f.status === 'uploading' && <span className="text-white/30">Claude is analyzing...</span>}
                        {f.status === 'done' && <span className="text-emerald-400/80">{f.count} holdings extracted</span>}
                        {f.status === 'error' && <span className="text-red-400/60">{f.error ?? 'Failed'}</span>}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {f.status === 'pending' && !processing && (
                        <button onClick={() => removeFile(i)} className="text-white/25 hover:text-white/50 transition-colors">
                          <X className="size-4" />
                        </button>
                      )}
                      {f.status === 'uploading' && <Loader2 className="size-4 text-white/30 animate-spin" />}
                      {f.status === 'done' && <CheckCircle2 className="size-4 text-emerald-400" />}
                      {f.status === 'error' && <AlertCircle className="size-4 text-red-400/60" />}
                      {/* Toggle stream log for completed files */}
                      {(f.status === 'done' || f.status === 'error') && f.streamText && (
                        <button
                          onClick={() => toggleStreamCollapsed(i)}
                          className="text-white/20 hover:text-white/40 transition-colors"
                          title={f.streamCollapsed ? 'Show log' : 'Hide log'}
                        >
                          <ChevronDown className={`size-3.5 transition-transform duration-200 ${f.streamCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {f.status === 'pending' && (
                    <input
                      type="text"
                      placeholder="Describe this file (optional)"
                      value={f.description}
                      onChange={(e) => updateDescription(i, e.target.value)}
                      className="w-full rounded-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5 text-xs text-white/60 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/15"
                    />
                  )}

                  {/* Stream panel: show while uploading, collapsible after done */}
                  {f.status === 'uploading' && (
                    <StreamPanel text={f.streamText} active />
                  )}
                  {(f.status === 'done' || f.status === 'error') && f.streamText && !f.streamCollapsed && (
                    <StreamPanel text={f.streamText} active={false} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {anyPending && files.length > 0 && (
              <Button
                onClick={processAll}
                disabled={processing}
                className="flex-1 bg-white text-black hover:bg-white/90 h-11 text-sm font-medium"
              >
                {processing ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  `Extract ${files.filter((f) => f.status === 'pending').length} file${files.filter((f) => f.status === 'pending').length === 1 ? '' : 's'}`
                )}
              </Button>
            )}
            {allDone && (
              <Button
                onClick={() => { setFiles([]); setSelectedSource(null); if (mode === 'new') setSourceName(''); }}
                variant="ghost"
                className="border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/5 h-11"
              >
                <Plus className="size-4 mr-1.5" />
                Upload More
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recalculate section */}
      {holdingsBySource.length > 0 && (
        <Card className="border-white/[0.06] bg-[#0a0a0a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
              Portfolio Health Check
            </CardTitle>
            <Button
              onClick={recalculate}
              disabled={recalculating}
              size="sm"
              className="bg-white/[0.06] text-white/60 hover:bg-white/[0.10] hover:text-white/80 border border-white/[0.08] h-8 text-xs"
            >
              {recalculating ? (
                <><Loader2 className="size-3 mr-1.5 animate-spin" />Recalculating...</>
              ) : (
                <><Activity className="size-3 mr-1.5" />Recalculate Live Values</>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {!recalcResult && !recalculating && (
              <p className="text-xs text-white/25">
                Re-runs the enrichment pipeline — fetches live prices, converts currencies, and shows the result. Use this to verify data fixes.
              </p>
            )}

            {recalcResult && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-white/30">Live Portfolio Total</p>
                    <p className="text-xl font-semibold tabular-nums text-white/90">
                      {formatCurrency(recalcResult.total_value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/30">Holdings</p>
                    <p className="text-sm font-medium tabular-nums text-white/60">
                      {recalcResult.holdings_count}
                    </p>
                  </div>
                  {recalcResult.stale_count > 0 && (
                    <div>
                      <p className="text-xs text-white/30">No Live Price</p>
                      <p className="text-sm font-medium tabular-nums text-amber-400/80">
                        {recalcResult.stale_count}
                      </p>
                    </div>
                  )}
                  {recalcResult.fx_fail_count > 0 && (
                    <div>
                      <p className="text-xs text-white/30">FX Failed</p>
                      <p className="text-sm font-medium tabular-nums text-red-400/80">
                        {recalcResult.fx_fail_count}
                      </p>
                    </div>
                  )}
                </div>

                {/* Warnings */}
                {recalcResult.warnings.length > 0 && (
                  <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3 space-y-1">
                    {recalcResult.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-400/70 flex items-start gap-1.5">
                        <AlertTriangle className="size-3 mt-0.5 shrink-0" />
                        {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Per-holding table */}
                <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-white/[0.06]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#0a0a0a] border-b border-white/[0.06]">
                      <tr className="text-white/30">
                        <th className="text-left px-3 py-2 font-medium">Asset</th>
                        <th className="text-right px-3 py-2 font-medium">Base Value</th>
                        <th className="text-right px-3 py-2 font-medium">Live (AUD)</th>
                        <th className="text-right px-3 py-2 font-medium">FX</th>
                        <th className="text-right px-3 py-2 font-medium">Day</th>
                        <th className="text-center px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {recalcResult.items.map((item, i) => (
                        <tr
                          key={i}
                          className={
                            item.fx_failed
                              ? 'bg-red-500/[0.03]'
                              : item.stale
                                ? 'bg-amber-500/[0.02]'
                                : ''
                          }
                        >
                          <td className="px-3 py-2">
                            <p className="text-white/60 truncate max-w-[12rem]">{item.asset_name}</p>
                            <p className="text-white/20 text-[10px]">{item.ticker ?? '—'} · {item.source}</p>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-white/35">
                            {formatCurrency(item.base_value)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-white/60 font-medium">
                            {formatCurrency(item.effective_value)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-white/30">
                            {item.price_currency && item.price_currency !== 'AUD' ? (
                              item.fx_rate != null ? (
                                <span>{item.price_currency} {item.fx_rate.toFixed(4)}</span>
                              ) : (
                                <span className="text-red-400/60">no rate</span>
                              )
                            ) : (
                              <span className="text-white/15">AUD</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {item.day_change_pct != null ? (
                              <span className={`inline-flex items-center gap-0.5 ${item.day_change_pct >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                {item.day_change_pct >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                                {item.day_change_pct >= 0 ? '+' : ''}{item.day_change_pct.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-white/15">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {item.fx_failed ? (
                              <span className="inline-flex items-center gap-1 text-red-400/70 text-[10px]">
                                <AlertCircle className="size-2.5" />FX fail
                              </span>
                            ) : item.stale ? (
                              <span className="inline-flex items-center gap-1 text-amber-400/70 text-[10px]">
                                <AlertTriangle className="size-2.5" />stale
                              </span>
                            ) : (
                              <span className="text-emerald-400/60 text-[10px]">live</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing holdings by source */}
      {holdingsBySource.length > 0 && (
        <Card className="border-white/[0.06] bg-[#0a0a0a]">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
              Your Sources · {staticHoldings.length} holdings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {holdingsBySource.map((group) => (
              <div
                key={group.source}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden"
              >
                {deletingSource === group.source ? (
                  /* Delete confirmation */
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs text-white/50">
                      Delete all <span className="text-red-400/80 font-medium">{group.count} holdings</span> from <span className="text-white/70 font-medium">{group.source}</span>?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteSource(group.source)}
                        disabled={deleteLoading}
                        className="inline-flex items-center rounded-md bg-red-500/15 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                      >
                        {deleteLoading ? <Loader2 className="size-3 mr-1.5 animate-spin" /> : <Trash2 className="size-3 mr-1.5" />}
                        Delete
                      </button>
                      <button
                        onClick={() => setDeletingSource(null)}
                        disabled={deleteLoading}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white/60 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal source row */
                  <div className="flex items-center px-4 py-3 group">
                    <button
                      onClick={() => {
                        setMode('add');
                        selectSource(group.source);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex-1 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-white/70">{group.source}</p>
                        <p className="text-xs text-white/30 mt-0.5">{group.count} holding{group.count !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="font-mono text-sm tabular-nums text-white/50">
                        {formatCurrency(group.total)}
                      </span>
                    </button>
                    <button
                      onClick={() => setDeletingSource(group.source)}
                      className="ml-3 p-1.5 rounded-md text-white/10 hover:text-red-400/60 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete source"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StreamPanel({ text, active }: { text: string; active: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text]);

  const visibleText = text.length > 0 ? text : 'Waiting for Claude...';

  return (
    <div
      ref={scrollRef}
      className="max-h-40 overflow-y-auto rounded-lg bg-black/60 border border-white/[0.06] p-3 font-mono text-[11px] leading-relaxed text-white/50 whitespace-pre-wrap break-words"
    >
      {visibleText}
      {active && (
        <span className="inline-block w-1.5 h-3.5 bg-white/40 ml-0.5 animate-pulse align-text-bottom" />
      )}
    </div>
  );
}
