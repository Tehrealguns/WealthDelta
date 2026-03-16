'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function ResearchContent() {
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [tokens, setTokens] = useState<{ input: number; output: number } | null>(null);
  const [focusAreas, setFocusAreas] = useState('');

  async function generateReport() {
    setGenerating(true);
    try {
      const snapshotRes = await fetch('/api/snapshots/generate', { method: 'POST' });
      if (!snapshotRes.ok) {
        const err = await snapshotRes.json() as { details?: string };
        throw new Error(err.details ?? 'Failed to generate snapshot');
      }

      const res = await fetch('/api/research/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusAreas }),
      });

      const json = await res.json() as {
        report?: string;
        tokens?: { input: number; output: number };
        details?: string;
      };

      if (!res.ok) {
        throw new Error(json.details ?? 'Failed to generate report');
      }

      setReport(json.report ?? null);
      setTokens(json.tokens ?? null);
      toast.success('Research report generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function downloadAsText() {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WealthDelta-Research-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Research Report
          </h1>
          <p className="text-white/25 text-sm mt-1">
            Deep-dive portfolio analysis with market context and recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={generateReport}
            disabled={generating}
            className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5"
          >
            {generating ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 mr-1.5" />
            )}
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
          {report && (
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadAsText}
              className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5"
            >
              <FileDown className="size-3.5 mr-1.5" />
              Download
            </Button>
          )}
        </div>
      </div>

      <Card className="border-white/[0.06] bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
            Focus Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={focusAreas}
            onChange={(e) => setFocusAreas(e.target.value)}
            placeholder="e.g. Analyze tech equity concentration, evaluate fixed income duration risk, assess private equity liquidity..."
            rows={2}
            className="w-full rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-sm text-white/60 placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
          />
        </CardContent>
      </Card>

      {report ? (
        <Card className="border-white/[0.06] bg-[#0a0a0a]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
              Report
            </CardTitle>
            {tokens && (
              <span className="text-xs text-white/10">
                {tokens.input}+{tokens.output} tokens
              </span>
            )}
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none">
              {report.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return (
                    <h1 key={i} className="text-lg font-semibold text-white/80 mt-8 mb-3 first:mt-0">
                      {line.replace('# ', '')}
                    </h1>
                  );
                }
                if (line.startsWith('## ')) {
                  return (
                    <h2 key={i} className="text-sm font-medium text-white/60 mt-6 mb-2 uppercase tracking-wide">
                      {line.replace('## ', '')}
                    </h2>
                  );
                }
                if (line.startsWith('- ')) {
                  return (
                    <p key={i} className="text-sm text-white/40 leading-relaxed pl-4 border-l border-white/[0.06] my-1">
                      {line.replace('- ', '')}
                    </p>
                  );
                }
                if (line.trim() === '') {
                  return <div key={i} className="h-3" />;
                }
                return (
                  <p key={i} className="text-sm text-white/40 leading-relaxed my-1">
                    {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-white/[0.06] bg-[#0a0a0a]">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-white/25 mb-4">
              Generate a comprehensive portfolio research report
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateReport}
              disabled={generating}
              className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5"
            >
              {generating ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5 mr-1.5" />
              )}
              Generate Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
