'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Send, RefreshCw, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface BriefingRow {
  id: string;
  briefing_date: string;
  summary_text: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  model: string | null;
  custom_instructions: string | null;
  created_at: string;
}

interface BriefingContentProps {
  briefings: BriefingRow[];
  userEmail: string;
}

export function BriefingContent({ briefings, userEmail }: BriefingContentProps) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(
    briefings[0]?.id ?? null,
  );
  const router = useRouter();

  const latestBriefing = briefings[0] ?? null;

  async function generateBriefing() {
    setGenerating(true);
    try {
      const snapshotRes = await fetch('/api/snapshots/generate', { method: 'POST' });
      if (!snapshotRes.ok) {
        const err = await snapshotRes.json() as { details?: string };
        throw new Error(err.details ?? 'Failed to generate snapshot');
      }

      const briefingRes = await fetch('/api/briefing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customInstructions }),
      });

      if (!briefingRes.ok) {
        const err = await briefingRes.json() as { details?: string };
        throw new Error(err.details ?? 'Failed to generate briefing');
      }

      toast.success('Briefing generated');
      setEditedContent(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function sendEmail() {
    if (!latestBriefing) return;
    setSending(true);
    try {
      const res = await fetch('/api/briefing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefingId: latestBriefing.id,
          content: editedContent ?? latestBriefing.summary_text,
          toEmail: userEmail,
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { details?: string };
        throw new Error(err.details ?? 'Failed to send');
      }

      toast.success('Briefing emailed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Daily Briefing
          </h1>
          <p className="text-white/25 text-sm mt-1">
            AI-powered portfolio analysis delivered to your inbox
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-white/30 hover:text-white hover:bg-white/5"
          >
            <Settings2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateBriefing}
            disabled={generating}
            className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5"
          >
            {generating ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 mr-1.5" />
            )}
            {generating ? 'Generating...' : 'Generate'}
          </Button>
          {latestBriefing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={sendEmail}
              disabled={sending}
              className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5"
            >
              {sending ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="size-3.5 mr-1.5" />
              )}
              Email Briefing
            </Button>
          )}
        </div>
      </div>

      {showSettings && (
        <Card className="border-white/[0.06] bg-[#0a0a0a]">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
              Briefing Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs text-white/30 mb-2">
                Custom Instructions
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Focus on equity risk, highlight any positions above 10% concentration, write in a more concise style..."
                rows={3}
                className="w-full rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-sm text-white/60 placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
              />
              <p className="text-xs text-white/15 mt-1">
                These instructions will be appended to the AI prompt each time you generate.
              </p>
            </div>
            <div>
              <label className="block text-xs text-white/30 mb-2">
                Important Things to Watch
              </label>
              <textarea
                value={customInstructions.includes('WATCH:') ? customInstructions.split('WATCH:')[1] : ''}
                onChange={(e) => {
                  const base = customInstructions.split('WATCH:')[0].trim();
                  setCustomInstructions(
                    e.target.value ? `${base}\nWATCH: ${e.target.value}` : base,
                  );
                }}
                placeholder="e.g. BHP position nearing stop-loss, monitor USD/AUD exposure, track private equity capital calls..."
                rows={2}
                className="w-full rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-sm text-white/60 placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {latestBriefing && (
        <Card className="border-white/[0.06] bg-[#0a0a0a]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
                Latest Briefing
              </CardTitle>
              <p className="text-xs text-white/15 mt-1">
                {new Date(latestBriefing.briefing_date).toLocaleDateString('en-AU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {latestBriefing.model && (
                  <span className="ml-2 text-white/10">
                    {latestBriefing.prompt_tokens}+{latestBriefing.completion_tokens} tokens
                  </span>
                )}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={editedContent ?? latestBriefing.summary_text}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={20}
              className="w-full rounded-md bg-transparent border-0 px-0 text-sm text-white/60 leading-relaxed focus:outline-none resize-none font-[family-name:var(--font-mono)]"
            />
            {editedContent && editedContent !== latestBriefing.summary_text && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                <span className="text-xs text-white/20">Content edited</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/30 hover:text-white text-xs"
                  onClick={() => setEditedContent(null)}
                >
                  Reset
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!latestBriefing && (
        <Card className="border-white/[0.06] bg-[#0a0a0a]">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-white/25 mb-4">No briefings generated yet</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateBriefing}
              disabled={generating}
              className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5"
            >
              {generating ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5 mr-1.5" />
              )}
              Generate Your First Briefing
            </Button>
          </CardContent>
        </Card>
      )}

      {briefings.length > 1 && (
        <div>
          <h2 className="text-xs font-medium text-white/30 tracking-widest uppercase mb-4">
            Previous Briefings
          </h2>
          <div className="space-y-2">
            {briefings.slice(1).map((b) => (
              <Card key={b.id} className="border-white/[0.06] bg-[#0a0a0a]">
                <button
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm text-white/40">
                    {new Date(b.briefing_date).toLocaleDateString('en-AU', {
                      weekday: 'short',
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
