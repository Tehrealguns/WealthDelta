'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ArrowRight,
  Shield,
  TrendingUp,
  Scale,
  BarChart3,
  Wallet,
  Target,
  Clock,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

const FOCUS_AREAS = [
  { id: 'risk', label: 'Risk Management', icon: Shield, description: 'Concentration, drawdown, volatility' },
  { id: 'growth', label: 'Growth Opportunities', icon: TrendingUp, description: 'Undervalued positions, momentum' },
  { id: 'tax', label: 'Tax Efficiency', icon: Scale, description: 'CGT events, franking credits, harvesting' },
  { id: 'macro', label: 'Market Context', icon: BarChart3, description: 'Macro trends, sector rotation' },
  { id: 'income', label: 'Income & Yield', icon: Wallet, description: 'Dividends, coupons, distributions' },
  { id: 'rebalance', label: 'Rebalancing', icon: Target, description: 'Drift from target allocation' },
] as const;

const TIME_OPTIONS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '20:00', label: '8:00 PM' },
];

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
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState(
    existingSettings?.custom_instructions ?? '',
  );
  const [watchItems, setWatchItems] = useState(
    existingSettings?.watch_items ?? '',
  );
  const [emailTime, setEmailTime] = useState(
    existingSettings?.email_time ?? '07:00',
  );
  const [includePdf, setIncludePdf] = useState(
    existingSettings?.include_pdf ?? true,
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function toggleFocus(id: string) {
    setFocusAreas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleContinue() {
    setSaving(true);

    const focusLabels = focusAreas
      .map((id) => FOCUS_AREAS.find((f) => f.id === id)?.label)
      .filter(Boolean);

    const instructions = [
      focusLabels.length > 0
        ? `Priority focus areas: ${focusLabels.join(', ')}.`
        : '',
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
        throw new Error(err.details ?? 'Failed to save preferences');
      }

      router.push('/setup');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Personalize your briefings
        </h1>
        <p className="text-white/30 text-sm">
          Tell us what matters most so Claude can tailor your daily executive summary.
        </p>
        <p className="text-white/15 text-xs">{userEmail}</p>
      </div>

      {/* Focus Areas */}
      <Card className="border-white/[0.06] bg-black/40 backdrop-blur-2xl">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-white/60 mb-1">
              What should your briefing focus on?
            </h2>
            <p className="text-xs text-white/20">
              Select all that apply. These guide the AI's analysis priorities.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FOCUS_AREAS.map((area) => {
              const selected = focusAreas.includes(area.id);
              const Icon = area.icon;
              return (
                <button
                  key={area.id}
                  onClick={() => toggleFocus(area.id)}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? 'border-white/20 bg-white/[0.06]'
                      : 'border-white/[0.06] hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon
                    className={`size-4 mb-2 ${
                      selected ? 'text-white/70' : 'text-white/20'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      selected ? 'text-white/80' : 'text-white/40'
                    }`}
                  >
                    {area.label}
                  </span>
                  <span className="text-xs text-white/15 mt-0.5">
                    {area.description}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Instructions */}
      <Card className="border-white/[0.06] bg-black/40 backdrop-blur-2xl">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-white/60 mb-1">
              Additional instructions for Claude
            </h2>
            <p className="text-xs text-white/20">
              Anything specific about how you want your briefing written.
            </p>
          </div>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g. Compare performance against ASX200, write concisely, highlight positions above 10% concentration, mention upcoming dividend dates..."
            rows={3}
            className="w-full rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 text-sm text-white/60 placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
          />
        </CardContent>
      </Card>

      {/* Watch Items */}
      <Card className="border-white/[0.06] bg-black/40 backdrop-blur-2xl">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-white/60 mb-1">
              Positions or events to watch
            </h2>
            <p className="text-xs text-white/20">
              Flagged in every briefing until you remove them.
            </p>
          </div>
          <textarea
            value={watchItems}
            onChange={(e) => setWatchItems(e.target.value)}
            placeholder="e.g. BHP nearing stop-loss at $38, monitor USD/AUD if it breaks 0.65, track PE capital call deadline Q2..."
            rows={3}
            className="w-full rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 text-sm text-white/60 placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
          />
        </CardContent>
      </Card>

      {/* Delivery Preferences */}
      <Card className="border-white/[0.06] bg-black/40 backdrop-blur-2xl">
        <CardContent className="pt-6 space-y-6">
          <h2 className="text-sm font-medium text-white/60">
            Delivery preferences
          </h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="size-4 text-white/20" />
              <div>
                <p className="text-sm text-white/50">Briefing delivery time</p>
                <p className="text-xs text-white/15 mt-0.5">
                  Your daily briefing will arrive at this time (AEST)
                </p>
              </div>
            </div>
            <select
              value={emailTime}
              onChange={(e) => setEmailTime(e.target.value)}
              className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-2 text-sm text-white/50 focus:outline-none focus:ring-1 focus:ring-white/10 appearance-none"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#0a0a0a] text-white/60">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="size-4 text-white/20" />
              <div>
                <p className="text-sm text-white/50">Attach research PDF</p>
                <p className="text-xs text-white/15 mt-0.5">
                  Deep-dive analysis as a PDF attachment
                </p>
              </div>
            </div>
            <button
              onClick={() => setIncludePdf(!includePdf)}
              className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                includePdf ? 'bg-emerald-500/50' : 'bg-white/10'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  includePdf ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Continue */}
      <div className="flex gap-4">
        <Button
          onClick={() => router.push('/setup')}
          variant="ghost"
          className="flex-1 border border-white/[0.06] text-white/30 hover:text-white hover:bg-white/5 h-12"
        >
          Skip for now
        </Button>
        <Button
          onClick={handleContinue}
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
              Continue to Upload
              <ArrowRight className="size-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
