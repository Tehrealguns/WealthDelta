'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileUp, Loader2, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  count: number;
  source: string;
  error?: string;
}

interface SetupWizardProps {
  userEmail: string;
  hasExistingHoldings: boolean;
}

export function SetupWizard({ userEmail, hasExistingHoldings }: SetupWizardProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addFiles = useCallback((fileList: FileList) => {
    const pdfs = Array.from(fileList).filter((f) => f.type === 'application/pdf');
    if (pdfs.length === 0) {
      toast.error('Only PDF files are supported');
      return;
    }
    const oversized = pdfs.filter((f) => f.size > 45 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed 45 MB and may fail to process`);
    }
    setFiles((prev) => [
      ...prev,
      ...pdfs.map((file) => ({
        file,
        status: 'pending' as const,
        count: 0,
        source: '',
      })),
    ]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function processAll() {
    if (files.length === 0) return;
    setProcessing(true);

    let totalExtracted = 0;

    for (let i = 0; i < files.length; i++) {
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f)),
      );

      try {
        const formData = new FormData();
        formData.append('file', files[i].file);
        formData.append('fileName', files[i].file.name);

        const res = await fetch('/api/setup/upload', {
          method: 'POST',
          body: formData,
        });

        const json = (await res.json()) as {
          count?: number;
          source?: string;
          error?: string;
          details?: string;
        };

        if (!res.ok) {
          throw new Error(json.details ?? json.error ?? 'Extraction failed');
        }

        totalExtracted += json.count ?? 0;

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'done', count: json.count ?? 0, source: json.source ?? '' }
              : f,
          ),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Failed' }
              : f,
          ),
        );
      }
    }

    setProcessing(false);

    if (totalExtracted > 0) {
      toast.success(`Extracted ${totalExtracted} holdings across ${files.filter((f) => f.status === 'done').length} statements`);
    }
  }

  const allDone = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error');
  const anySuccess = files.some((f) => f.status === 'done');

  return (
    <div className="w-full max-w-xl space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Welcome to WealthDelta
        </h1>
        <p className="text-white/30 text-sm">
          Upload your latest bank statements to build your portfolio.
        </p>
        <p className="text-white/15 text-xs">
          {userEmail}
        </p>
      </div>

      {hasExistingHoldings && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center">
          <p className="text-sm text-white/40">
            You already have holdings. Upload more statements or{' '}
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/60 underline underline-offset-2 hover:text-white"
            >
              go to dashboard
            </button>
          </p>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 transition-all ${
          dragOver
            ? 'border-white/20 bg-white/[0.03]'
            : 'border-white/[0.06] hover:border-white/10'
        }`}
      >
        <Upload className="size-10 text-white/10 mb-5" />
        <p className="text-sm text-white/40 mb-1">
          Drop all your bank statements here
        </p>
        <p className="text-xs text-white/20 mb-5">
          UBS, JBWere, Stonehage, Macquarie, Bell Potter, Morgan Stanley, or any wealth statement
        </p>
        <label>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
          <span className="inline-flex items-center rounded-md border border-white/[0.08] px-4 py-2 text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 cursor-pointer transition-colors">
            <FileUp className="size-4 mr-2" /> Browse Files
          </span>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={`${f.file.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/60 truncate">
                  {f.file.name}
                  <span className="ml-2 text-white/15 text-xs">{formatFileSize(f.file.size)}</span>
                </p>
                <p className="text-xs text-white/20">
                  {f.status === 'pending' && 'Ready to process'}
                  {f.status === 'uploading' && 'Extracting with AI...'}
                  {f.status === 'done' && `${f.count} holdings from ${f.source || 'statement'}`}
                  {f.status === 'error' && (f.error ?? 'Failed')}
                </p>
              </div>
              <div className="shrink-0">
                {f.status === 'pending' && (
                  <button onClick={() => removeFile(i)} className="text-white/20 hover:text-white/50 transition-colors">
                    <X className="size-4" />
                  </button>
                )}
                {f.status === 'uploading' && (
                  <Loader2 className="size-4 text-white/30 animate-spin" />
                )}
                {f.status === 'done' && (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                )}
                {f.status === 'error' && (
                  <span className="text-xs text-red-400/60">Failed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        {!allDone && files.length > 0 && (
          <Button
            onClick={processAll}
            disabled={processing || files.length === 0}
            className="flex-1 bg-white text-black hover:bg-white/90 h-11 text-sm font-medium"
          >
            {processing ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Extract ${files.length} statement${files.length === 1 ? '' : 's'}`
            )}
          </Button>
        )}

        {allDone && anySuccess && (
          <Button
            onClick={() => router.push('/dashboard')}
            className="flex-1 bg-white text-black hover:bg-white/90 h-11 text-sm font-medium"
          >
            Go to Dashboard
            <ArrowRight className="size-4 ml-2" />
          </Button>
        )}

        {hasExistingHoldings && files.length === 0 && (
          <Button
            onClick={() => router.push('/dashboard')}
            variant="ghost"
            className="flex-1 border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/5 h-11"
          >
            Skip to Dashboard
            <ArrowRight className="size-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
