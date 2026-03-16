'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HoldingsTable } from '@/components/holdings-table';
import { Upload, FileUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { HoldingRow } from '@/lib/types';

type ExtractStatus = 'idle' | 'uploading' | 'extracting' | 'done' | 'error';

interface VaultContentProps {
  staticHoldings: HoldingRow[];
}

export function VaultContent({ staticHoldings }: VaultContentProps) {
  const [status, setStatus] = useState<ExtractStatus>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [extractedCount, setExtractedCount] = useState(0);
  const router = useRouter();

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported');
      return;
    }

    setStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setStatus('extracting');
      const res = await fetch('/api/vault/extract', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json() as { count?: number; error?: string; details?: string };

      if (!res.ok) {
        throw new Error(json.details ?? json.error ?? 'Extraction failed');
      }

      setExtractedCount(json.count ?? 0);
      setStatus('done');
      toast.success(`Extracted ${json.count} holdings from PDF`);
      router.refresh();
    } catch (err) {
      setStatus('error');
      toast.error(err instanceof Error ? err.message : 'Extraction failed');
    }
  }, [router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">The Vault</h1>
        <p className="text-white/25 text-sm mt-1">
          Upload wealth statements from custodians. PDF-to-portfolio in seconds.
        </p>
      </div>

      <Card className="border-white/[0.06] bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
            Upload Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              dragOver
                ? 'border-white/20 bg-white/[0.02]'
                : 'border-white/[0.06] hover:border-white/10'
            }`}
          >
            {status === 'idle' && (
              <>
                <Upload className="size-8 text-white/15 mb-4" />
                <p className="text-sm text-white/40 mb-1">Drag and drop a PDF here</p>
                <p className="text-xs text-white/20 mb-4">Stonehage Fleming, UBS, or any wealth statement</p>
                <label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                  <span className="inline-flex items-center rounded-md border border-white/[0.06] px-3 py-1.5 text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 cursor-pointer transition-colors">
                    <FileUp className="size-3.5 mr-1.5" /> Browse Files
                  </span>
                </label>
              </>
            )}

            {(status === 'uploading' || status === 'extracting') && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-6 text-white/30 animate-spin" />
                <p className="text-sm text-white/40">
                  {status === 'uploading' ? 'Uploading...' : 'Extracting holdings with AI...'}
                </p>
              </div>
            )}

            {status === 'done' && (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="size-6 text-emerald-400" />
                <p className="text-sm text-white/60">
                  Extracted {extractedCount} holdings
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/40 hover:text-white hover:bg-white/5"
                  onClick={() => { setStatus('idle'); setExtractedCount(0); }}
                >
                  Upload Another
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="size-6 text-red-400" />
                <p className="text-sm text-white/40">Extraction failed</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/40 hover:text-white hover:bg-white/5"
                  onClick={() => setStatus('idle')}
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {staticHoldings.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-white/30 tracking-widest uppercase mb-4">
            Extracted Holdings
          </h2>
          <HoldingsTable data={staticHoldings} />
        </div>
      )}
    </div>
  );
}
