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
  const [replaceSource, setReplaceSource] = useState<string | null>(null);

  const existingSources = [...new Set(staticHoldings.map((h) => h.source))].sort();

  const holdingsBySource = existingSources.map((source) => {
    const holdings = staticHoldings.filter((h) => h.source === source);
    const total = holdings.reduce((s, h) => s + Number(h.valuation_base), 0);
    return { source, count: holdings.length, total };
  });

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

  async function processFile(idx: number) {
    const f = files[idx];
    updateFile(idx, { status: 'uploading', streamText: '' });

    const formData = new FormData();
    formData.append('file', f.file);
    formData.append('fileName', f.file.name);
    if (sourceName.trim()) formData.append('portfolioName', sourceName.trim());
    if (f.description) formData.append('description', f.description);
    if (replaceSource && idx === 0) formData.append('replaceSource', replaceSource);

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
              return event.count ?? 0;
            } else if (event.type === 'error') {
              updateFile(idx, { status: 'error', error: event.message ?? 'Failed', streamText: accumulated });
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
          {/* Mode: add new vs update existing */}
          {existingSources.length > 0 && (
            <div className="space-y-3">
              <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
                <button
                  onClick={() => { setReplaceSource(null); setSourceName(''); }}
                  className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                    !replaceSource
                      ? 'bg-white/[0.08] text-white/80'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                  }`}
                >
                  Add New Source
                </button>
                <button
                  onClick={() => {
                    if (!replaceSource && existingSources[0]) {
                      setReplaceSource(existingSources[0]);
                      setSourceName(existingSources[0]);
                    }
                  }}
                  className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors border-l border-white/[0.08] ${
                    replaceSource
                      ? 'bg-white/[0.08] text-white/80'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                  }`}
                >
                  <RefreshCw className="size-3 inline mr-1.5 -mt-px" />
                  Update Existing
                </button>
              </div>

              {replaceSource && (
                <div className="flex flex-wrap gap-1.5">
                  {existingSources.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setReplaceSource(s); setSourceName(s); }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        replaceSource === s
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
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

          {/* Source name input */}
          {!replaceSource && (
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

          {replaceSource && (
            <p className="text-xs text-white/30">
              Uploading will replace all holdings from <span className="text-amber-400/70 font-medium">{replaceSource}</span> with the new data.
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
                      <p className="text-xs text-white/30 mt-0.5">
                        {f.status === 'pending' && 'Ready'}
                        {f.status === 'uploading' && 'Claude is analyzing...'}
                        {f.status === 'done' && `${f.count} holdings extracted`}
                        {f.status === 'error' && (f.error ?? 'Failed')}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {f.status === 'pending' && !processing && (
                        <button onClick={() => removeFile(i)} className="text-white/25 hover:text-white/50 transition-colors">
                          <X className="size-4" />
                        </button>
                      )}
                      {f.status === 'uploading' && <Loader2 className="size-4 text-white/30 animate-spin" />}
                      {f.status === 'done' && <CheckCircle2 className="size-4 text-emerald-400" />}
                      {f.status === 'error' && <AlertCircle className="size-4 text-red-400/60" />}
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

                  {(f.status === 'uploading' || f.streamText) && (
                    <StreamPanel text={f.streamText} active={f.status === 'uploading'} />
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
                onClick={() => { setFiles([]); setReplaceSource(null); }}
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
              <button
                key={group.source}
                onClick={() => {
                  setReplaceSource(group.source);
                  setSourceName(group.source);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] hover:border-white/[0.10] transition-colors group"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-white/70">{group.source}</p>
                  <p className="text-xs text-white/30 mt-0.5">{group.count} holding{group.count !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm tabular-nums text-white/50">
                    {formatCurrency(group.total)}
                  </span>
                  <RefreshCw className="size-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
                </div>
              </button>
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
