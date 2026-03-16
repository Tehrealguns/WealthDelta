'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface UserSettings {
  id: string;
  custom_instructions: string;
  watch_items: string;
  email_enabled: boolean;
  email_time: string;
  include_pdf: boolean;
}

interface BriefingRow {
  id: string;
  briefing_date: string;
  summary_text: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  model: string | null;
  created_at: string;
}

interface BriefingSettingsProps {
  settings: UserSettings;
  briefings: BriefingRow[];
  userEmail: string;
}

export function BriefingSettings({ settings, briefings, userEmail }: BriefingSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [instructions, setInstructions] = useState(settings.custom_instructions);
  const [watchItems, setWatchItems] = useState(settings.watch_items);
  const [emailEnabled, setEmailEnabled] = useState(settings.email_enabled);
  const [includePdf, setIncludePdf] = useState(settings.include_pdf);
  const [expandedId, setExpandedId] = useState<string | null>(
    briefings[0]?.id ?? null,
  );
  const router = useRouter();

  async function testSendNow() {
    setTesting(true);
    try {
      await saveSettings();

      const snapshotRes = await fetch('/api/snapshots/generate', { method: 'POST' });
      if (!snapshotRes.ok) {
        const err = await snapshotRes.json() as { details?: string };
        throw new Error(err.details ?? 'Snapshot failed');
      }

      const briefingRes = await fetch('/api/briefing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customInstructions: [instructions, watchItems ? `WATCH: ${watchItems}` : ''].filter(Boolean).join('\n'),
        }),
      });

      if (!briefingRes.ok) {
        const err = await briefingRes.json() as { details?: string };
        throw new Error(err.details ?? 'Briefing generation failed');
      }

      const briefingData = await briefingRes.json() as { briefing: { id: string; summary_text: string } };

      const sendRes = await fetch('/api/briefing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefingId: briefingData.briefing.id,
          content: briefingData.briefing.summary_text,
          toEmail: userEmail,
        }),
      });

      if (!sendRes.ok) {
        const err = await sendRes.json() as { details?: string };
        throw new Error(err.details ?? 'Email send failed');
      }

      toast.success('Briefing generated and emailed to you');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_instructions: instructions,
          watch_items: watchItems,
          email_enabled: emailEnabled,
          include_pdf: includePdf,
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { details?: string };
        throw new Error(err.details ?? 'Failed to save');
      }

      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Briefing Settings
          </h1>
          <p className="text-white/25 text-sm mt-1">
            Configure your daily executive summary and research report
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={saveSettings}
            disabled={saving || testing}
            className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5"
          >
            {saving ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="size-3.5 mr-1.5" />
            )}
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={testSendNow}
            disabled={testing || saving}
            className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5"
          >
            {testing ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Send className="size-3.5 mr-1.5" />
            )}
            {testing ? 'Generating & Sending...' : 'Generate & Email Now'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-white/[0.06] bg-[#0a0a0a]">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
              Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Daily email</p>
                <p className="text-xs text-white/20 mt-0.5">
                  Delivered to {userEmail}
                </p>
              </div>
              <button
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  emailEnabled ? 'bg-emerald-500/50' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    emailEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Attach research PDF</p>
                <p className="text-xs text-white/20 mt-0.5">
                  Detailed analysis as a PDF attachment
                </p>
              </div>
              <button
                onClick={() => setIncludePdf(!includePdf)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  includePdf ? 'bg-emerald-500/50' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    includePdf ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-[#0a0a0a]">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Total briefings</span>
              <span className="text-sm text-white/60 font-mono">{briefings.length}</span>
            </div>
            {briefings[0] && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/40">Last generated</span>
                <span className="text-sm text-white/60 font-mono">
                  {new Date(briefings[0].briefing_date).toLocaleDateString('en-AU', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
            {briefings[0]?.model && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/40">Model</span>
                <span className="text-sm text-white/60 font-mono">{briefings[0].model}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/[0.06] bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
            Briefing Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs text-white/30 mb-2">
              Custom instructions for Claude
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on equity risk, highlight positions above 10% concentration, write concisely, compare to ASX200 performance..."
              rows={3}
              className="w-full rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-sm text-white/60 placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-white/30 mb-2">
              Things to watch
            </label>
            <textarea
              value={watchItems}
              onChange={(e) => setWatchItems(e.target.value)}
              placeholder="e.g. BHP nearing stop-loss at $38, monitor USD/AUD if it breaks 0.65, track private equity capital call deadlines..."
              rows={3}
              className="w-full rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-sm text-white/60 placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
            />
            <p className="text-xs text-white/15 mt-1">
              These items will be flagged in every briefing until you remove them.
            </p>
          </div>
        </CardContent>
      </Card>

      {briefings.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-white/30 tracking-widest uppercase mb-4">
            Recent Briefings
          </h2>
          <div className="space-y-2">
            {briefings.map((b) => (
              <Card key={b.id} className="border-white/[0.06] bg-[#0a0a0a]">
                <button
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm text-white/40">
                    {new Date(b.briefing_date).toLocaleDateString('en-AU', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {expandedId === b.id ? (
                    <ChevronUp className="size-3.5 text-white/20" />
                  ) : (
                    <ChevronDown className="size-3.5 text-white/20" />
                  )}
                </button>
                {expandedId === b.id && (
                  <CardContent className="pt-0 pb-4">
                    <div className="text-sm text-white/40 leading-relaxed whitespace-pre-wrap font-[family-name:var(--font-mono)]">
                      {b.summary_text}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
