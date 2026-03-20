'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Shield,
  TrendingUp,
  Scale,
  BarChart3,
  Wallet,
  Target,
  Clock,
  FileText,
  Plus,
  Trash2,
  Upload,
  FileUp,
  CheckCircle2,
  X,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

// --------------- types ---------------

interface PortfolioFile {
  file: File;
  description: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  count: number;
  error?: string;
  streamText: string;
}

interface Portfolio {
  id: string;
  name: string;
  description: string;
  files: PortfolioFile[];
}

// --------------- constants ---------------

const FOCUS_AREAS = [
  { id: 'risk', label: 'Risk Management', icon: Shield, description: 'Concentration, drawdown, volatility' },
  { id: 'growth', label: 'Growth Opportunities', icon: TrendingUp, description: 'Undervalued positions, momentum' },
  { id: 'tax', label: 'Tax Efficiency', icon: Scale, description: 'CGT events, franking credits, harvesting' },
  { id: 'macro', label: 'Market Context', icon: BarChart3, description: 'Macro trends, sector rotation' },
  { id: 'income', label: 'Income & Yield', icon: Wallet, description: 'Dividends, coupons, distributions' },
  { id: 'rebalance', label: 'Rebalancing', icon: Target, description: 'Drift from target allocation' },
] as const;

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const hour24 = String(h).padStart(2, '0');
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? 'AM' : 'PM';
  return { value: `${hour24}:00`, label: `${hour12}:00 ${ampm}` };
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

// --------------- component ---------------

interface OnboardWizardProps {
  userEmail: string;
  existingSettings: {
    custom_instructions: string;
    watch_items: string;
    email_enabled: boolean;
    email_time: string;
    include_pdf: boolean;
  } | null;
}

export function OnboardWizard({ userEmail, existingSettings }: OnboardWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0: Portfolios
  const [portfolios, setPortfolios] = useState<Portfolio[]>([
    { id: makeId(), name: '', description: '', files: [] },
  ]);
  const [processing, setProcessing] = useState(false);

  // Step 1: Preferences
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState(
    existingSettings?.custom_instructions ?? '',
  );
  const [watchItems, setWatchItems] = useState(existingSettings?.watch_items ?? '');
  const [emailTime, setEmailTime] = useState(existingSettings?.email_time ?? '07:00');
  const [includePdf, setIncludePdf] = useState(existingSettings?.include_pdf ?? true);
  const [saving, setSaving] = useState(false);

  // --------------- portfolio helpers ---------------

  function addPortfolio() {
    setPortfolios((p) => [...p, { id: makeId(), name: '', description: '', files: [] }]);
  }

  function removePortfolio(id: string) {
    if (portfolios.length <= 1) return;
    setPortfolios((p) => p.filter((x) => x.id !== id));
  }

  function updatePortfolio(id: string, field: 'name' | 'description', value: string) {
    setPortfolios((p) =>
      p.map((x) => (x.id === id ? { ...x, [field]: value } : x)),
    );
  }

  function addFilesToPortfolio(id: string, fileList: FileList) {
    const newFiles = Array.from(fileList);
    if (newFiles.length === 0) return;
    setPortfolios((p) =>
      p.map((x) =>
        x.id === id
          ? {
              ...x,
              files: [
                ...x.files,
                ...newFiles.map((file) => ({ file, description: '', status: 'pending' as const, count: 0, streamText: '' })),
              ],
            }
          : x,
      ),
    );
  }

  function updateFileDescription(portfolioId: string, fileIndex: number, description: string) {
    setPortfolios((p) =>
      p.map((x) =>
        x.id === portfolioId
          ? { ...x, files: x.files.map((f, i) => (i === fileIndex ? { ...f, description } : f)) }
          : x,
      ),
    );
  }

  function removeFileFromPortfolio(portfolioId: string, fileIndex: number) {
    setPortfolios((p) =>
      p.map((x) =>
        x.id === portfolioId
          ? { ...x, files: x.files.filter((_, i) => i !== fileIndex) }
          : x,
      ),
    );
  }

  // --------------- process all files ---------------

  function updateFile(portfolioId: string, fileIndex: number, patch: Partial<PortfolioFile>) {
    setPortfolios((p) =>
      p.map((x) =>
        x.id === portfolioId
          ? { ...x, files: x.files.map((f, i) => (i === fileIndex ? { ...f, ...patch } : f)) }
          : x,
      ),
    );
  }

  async function processFileStream(portfolio: Portfolio, fi: number) {
    updateFile(portfolio.id, fi, { status: 'uploading', streamText: '' });

    const formData = new FormData();
    formData.append('file', portfolio.files[fi].file);
    formData.append('fileName', portfolio.files[fi].file.name);
    formData.append('portfolioName', portfolio.name.trim());
    if (portfolio.files[fi].description) {
      formData.append('description', portfolio.files[fi].description);
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
              updateFile(portfolio.id, fi, { streamText: accumulated });
            } else if (event.type === 'done') {
              updateFile(portfolio.id, fi, {
                status: 'done',
                count: event.count ?? 0,
                streamText: accumulated,
              });
              return event.count ?? 0;
            } else if (event.type === 'error') {
              updateFile(portfolio.id, fi, {
                status: 'error',
                error: event.message ?? 'Failed',
                streamText: accumulated,
              });
              return 0;
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      updateFile(portfolio.id, fi, { status: 'error', error: 'Stream ended unexpectedly' });
      return 0;
    } catch (err) {
      updateFile(portfolio.id, fi, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed',
      });
      return 0;
    }
  }

  async function processPortfolioSequentially(portfolio: Portfolio) {
    let count = 0;
    for (let fi = 0; fi < portfolio.files.length; fi++) {
      if (portfolio.files[fi].status !== 'pending') continue;
      count += await processFileStream(portfolio, fi);
    }
    return count;
  }

  async function processAllPortfolios() {
    const portfoliosWithFiles = portfolios.filter((p) => p.files.length > 0 && p.name.trim());
    if (portfoliosWithFiles.length === 0) {
      toast.error('Add a name and at least one file to a portfolio');
      return;
    }

    setProcessing(true);

    const results = await Promise.all(
      portfoliosWithFiles.map((portfolio) => processPortfolioSequentially(portfolio)),
    );

    const totalExtracted = results.reduce((s, n) => s + n, 0);

    setProcessing(false);
    if (totalExtracted > 0) {
      toast.success(`Extracted ${totalExtracted} holdings across ${portfoliosWithFiles.length} portfolio${portfoliosWithFiles.length === 1 ? '' : 's'}`);
    }
  }

  // --------------- save preferences ---------------

  async function savePreferences() {
    setSaving(true);

    const focusLabels = focusAreas
      .map((id) => FOCUS_AREAS.find((f) => f.id === id)?.label)
      .filter(Boolean);

    const instructions = [
      focusLabels.length > 0 ? `Priority focus areas: ${focusLabels.join(', ')}.` : '',
      customInstructions,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_instructions: instructions,
          watch_items: watchItems,
          email_enabled: true,
          email_time: emailTime,
          include_pdf: includePdf,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { details?: string };
        throw new Error(err.details ?? 'Failed to save');
      }
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  // --------------- derived ---------------

  const totalFiles = portfolios.reduce((s, p) => s + p.files.length, 0);
  const allDone = totalFiles > 0 && portfolios.every((p) => p.files.every((f) => f.status === 'done' || f.status === 'error'));
  const anyPending = portfolios.some((p) => p.files.some((f) => f.status === 'pending'));

  // --------------- render ---------------

  return (
    <div className="w-full max-w-2xl space-y-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {['Portfolios', 'Preferences'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-white/[0.12]" />}
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ${
              step === i
                ? 'bg-white/[0.10] text-white/80'
                : step > i
                  ? 'text-white/45'
                  : 'text-white/25'
            }`}>
              <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-medium ${
                step > i
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : step === i
                    ? 'bg-white/15 text-white/70'
                    : 'bg-white/[0.06] text-white/30'
              }`}>
                {step > i ? '✓' : i + 1}
              </span>
              {label}
            </div>
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Organize your wealth
            </h1>
            <p className="text-white/45 text-sm max-w-md mx-auto">
              Add each bank, platform, or custodian as a portfolio. Upload their statements and we&apos;ll extract everything.
            </p>
            <p className="text-white/30 text-xs">{userEmail}</p>
          </div>

          <div className="space-y-4">
            {portfolios.map((portfolio, pIndex) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                index={pIndex}
                canRemove={portfolios.length > 1}
                processing={processing}
                onUpdate={updatePortfolio}
                onRemove={removePortfolio}
                onAddFiles={addFilesToPortfolio}
                onRemoveFile={removeFileFromPortfolio}
                onUpdateFileDescription={updateFileDescription}
              />
            ))}
          </div>

          <button
            onClick={addPortfolio}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] py-4 text-sm text-white/40 transition-colors hover:border-white/20 hover:text-white/55 hover:bg-white/[0.03]"
          >
            <Plus className="size-4" />
            Add another portfolio
          </button>

          <div className="flex gap-3">
            {totalFiles > 0 && anyPending && (
              <Button
                onClick={processAllPortfolios}
                disabled={processing}
                className="flex-1 bg-white text-black hover:bg-white/90 h-12 text-sm font-medium"
              >
                {processing ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Extract ${totalFiles} statement${totalFiles === 1 ? '' : 's'}`
                )}
              </Button>
            )}

            {(allDone || totalFiles === 0) && (
              <Button
                onClick={() => setStep(1)}
                className="flex-1 bg-white text-black hover:bg-white/90 h-12 text-sm font-medium"
              >
                {totalFiles === 0 ? 'Skip uploads — set preferences' : 'Continue to Preferences'}
                <ArrowRight className="size-4 ml-2" />
              </Button>
            )}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Personalize your briefings
            </h1>
            <p className="text-white/45 text-sm">
              Tell us what matters most so Claude can tailor your daily executive summary.
            </p>
          </div>

          {/* Focus Areas */}
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur-2xl">
            <CardContent className="pt-6 space-y-4">
              <div>
                <h2 className="text-sm font-medium text-white/70 mb-1">
                  What should your briefing focus on?
                </h2>
                <p className="text-xs text-white/35">Select all that apply.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FOCUS_AREAS.map((area) => {
                  const selected = focusAreas.includes(area.id);
                  const Icon = area.icon;
                  return (
                    <button
                      key={area.id}
                      onClick={() =>
                        setFocusAreas((prev) =>
                          prev.includes(area.id)
                            ? prev.filter((x) => x !== area.id)
                            : [...prev, area.id],
                        )
                      }
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? 'border-white/25 bg-white/[0.10]'
                          : 'border-white/[0.08] hover:border-white/15 hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon className={`size-4 mb-2 ${selected ? 'text-white/80' : 'text-white/35'}`} />
                      <span className={`text-sm font-medium ${selected ? 'text-white/90' : 'text-white/50'}`}>
                        {area.label}
                      </span>
                      <span className="text-xs text-white/30 mt-0.5">{area.description}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Custom Instructions */}
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur-2xl">
            <CardContent className="pt-6 space-y-4">
              <div>
                <h2 className="text-sm font-medium text-white/70 mb-1">Additional instructions</h2>
                <p className="text-xs text-white/35">Anything specific about how you want your briefing.</p>
              </div>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Compare performance against ASX200, highlight positions above 10% concentration..."
                rows={3}
                className="w-full rounded-xl bg-white/[0.08] border border-white/10 px-4 py-3 text-sm text-white/70 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
              />
            </CardContent>
          </Card>

          {/* Watch Items */}
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur-2xl">
            <CardContent className="pt-6 space-y-4">
              <div>
                <h2 className="text-sm font-medium text-white/70 mb-1">Positions to watch</h2>
                <p className="text-xs text-white/35">Flagged in every briefing.</p>
              </div>
              <textarea
                value={watchItems}
                onChange={(e) => setWatchItems(e.target.value)}
                placeholder="e.g. BHP nearing stop-loss at $38, monitor USD/AUD if it breaks 0.65..."
                rows={3}
                className="w-full rounded-xl bg-white/[0.08] border border-white/10 px-4 py-3 text-sm text-white/70 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
              />
            </CardContent>
          </Card>

          {/* Delivery Time */}
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur-2xl">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="size-4 text-white/35" />
                <div>
                  <h2 className="text-sm font-medium text-white/70">Briefing delivery time</h2>
                  <p className="text-xs text-white/35 mt-0.5">Daily executive summary emailed at this time (AEST)</p>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {TIME_OPTIONS.map((t) => {
                  const selected = emailTime === t.value;
                  const hour = parseInt(t.value.split(':')[0], 10);
                  const isMorning = hour >= 5 && hour <= 9;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setEmailTime(t.value)}
                      className={`rounded-xl border px-2 py-2.5 text-center transition-all ${
                        selected
                          ? 'border-white/25 bg-white/[0.12] text-white/90'
                          : 'border-white/[0.08] text-white/35 hover:border-white/15 hover:text-white/50 hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="text-sm font-medium block">{t.label}</span>
                      {isMorning && <span className="text-[10px] text-emerald-400/50 block mt-0.5">popular</span>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* PDF Toggle */}
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="size-4 text-white/35" />
                  <div>
                    <p className="text-sm text-white/60">Attach research PDF</p>
                    <p className="text-xs text-white/30 mt-0.5">Deep-dive analysis as a PDF attachment</p>
                  </div>
                </div>
                <button
                  onClick={() => setIncludePdf(!includePdf)}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                    includePdf ? 'bg-emerald-500/50' : 'bg-white/10'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    includePdf ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              onClick={() => setStep(0)}
              variant="ghost"
              className="border border-white/10 text-white/45 hover:text-white hover:bg-white/5 h-12 px-6"
            >
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              className="flex-1 border border-white/10 text-white/45 hover:text-white hover:bg-white/5 h-12"
            >
              Skip for now
            </Button>
            <Button
              onClick={savePreferences}
              disabled={saving}
              className="flex-1 bg-white text-black hover:bg-white/90 h-12 text-sm font-medium"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Finish Setup
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// --------------- PortfolioCard ---------------

function PortfolioCard({
  portfolio,
  index,
  canRemove,
  processing,
  onUpdate,
  onRemove,
  onAddFiles,
  onRemoveFile,
  onUpdateFileDescription,
}: {
  portfolio: Portfolio;
  index: number;
  canRemove: boolean;
  processing: boolean;
  onUpdate: (id: string, field: 'name' | 'description', value: string) => void;
  onRemove: (id: string) => void;
  onAddFiles: (id: string, files: FileList) => void;
  onRemoveFile: (portfolioId: string, fileIndex: number) => void;
  onUpdateFileDescription: (portfolioId: string, fileIndex: number, description: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <Card className="border-white/10 bg-white/[0.06] backdrop-blur-2xl">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Briefcase className="size-4 text-white/40" />
            <span className="text-xs font-medium text-white/45 uppercase tracking-wider">
              Portfolio {index + 1}
            </span>
          </div>
          {canRemove && (
            <button
              onClick={() => onRemove(portfolio.id)}
              className="text-white/30 hover:text-red-400/70 transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <Input
            placeholder="e.g. UBS Private Banking, Macquarie Wrap, Family Trust"
            value={portfolio.name}
            onChange={(e) => onUpdate(portfolio.id, 'name', e.target.value)}
            className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/30 focus:border-white/25 h-11"
          />
          <textarea
            placeholder="Optional description — e.g. Australian equities and fixed income, managed by John Smith"
            value={portfolio.description}
            onChange={(e) => onUpdate(portfolio.id, 'description', e.target.value)}
            rows={2}
            className="w-full rounded-xl bg-white/[0.08] border border-white/10 px-4 py-3 text-sm text-white/70 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
          />
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onAddFiles(portfolio.id, e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
            dragOver
              ? 'border-white/25 bg-white/[0.05]'
              : 'border-white/[0.10] hover:border-white/15'
          }`}
        >
          <Upload className="size-6 text-white/20 mb-3" />
          <p className="text-xs text-white/40 mb-3">
            Drop files — PDFs, CSVs, screenshots, anything
          </p>
          <label>
            <input
              type="file"
              accept=".pdf,.csv,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.txt"
              multiple
              onChange={(e) => {
                if (e.target.files) onAddFiles(portfolio.id, e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
            <span className="inline-flex items-center rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-white/45 hover:text-white/60 hover:bg-white/5 cursor-pointer transition-colors">
              <FileUp className="size-3 mr-1.5" /> Browse
            </span>
          </label>
        </div>

        {/* File list */}
        {portfolio.files.length > 0 && (
          <div className="space-y-2">
            {portfolio.files.map((f, i) => (
              <div
                key={`${f.file.name}-${i}`}
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 truncate">
                      {f.file.name}
                      <span className="ml-1.5 text-white/30">{formatFileSize(f.file.size)}</span>
                    </p>
                    <p className="text-[11px] text-white/35">
                      {f.status === 'pending' && 'Ready'}
                      {f.status === 'uploading' && 'Claude is analyzing...'}
                      {f.status === 'done' && `${f.count} holdings extracted`}
                      {f.status === 'error' && (f.error ?? 'Failed')}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {f.status === 'pending' && !processing && (
                      <button
                        onClick={() => onRemoveFile(portfolio.id, i)}
                        className="text-white/30 hover:text-white/50 transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                    {f.status === 'uploading' && <Loader2 className="size-3.5 text-white/30 animate-spin" />}
                    {f.status === 'done' && <CheckCircle2 className="size-3.5 text-emerald-400" />}
                    {f.status === 'error' && <span className="text-[10px] text-red-400/60">Failed</span>}
                  </div>
                </div>
                {f.status === 'pending' && (
                  <input
                    type="text"
                    placeholder="Describe this file (optional) — e.g. Q4 2024 bond holdings, screenshot of crypto wallet"
                    value={f.description}
                    onChange={(e) => onUpdateFileDescription(portfolio.id, i, e.target.value)}
                    className="w-full rounded-md bg-white/[0.05] border border-white/[0.08] px-2.5 py-1.5 text-xs text-white/60 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/15"
                  />
                )}
                {(f.status === 'uploading' || f.streamText) && (
                  <StreamPanel text={f.streamText} active={f.status === 'uploading'} />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --------------- StreamPanel ---------------

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
