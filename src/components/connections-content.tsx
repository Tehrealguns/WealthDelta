'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Mail, Loader2, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

interface IngestedEmail {
  id: string;
  from_address: string | null;
  subject: string | null;
  status: string;
  holdings_extracted: number;
  received_at: string;
}

interface ConnectionsContentProps {
  vaultEmail: string;
  isActive: boolean;
  recentEmails: IngestedEmail[];
}

const statusColors: Record<string, string> = {
  processed: 'text-emerald-400',
  failed: 'text-red-400',
  duplicate: 'text-white/20',
  ignored: 'text-white/20',
};

export function ConnectionsContent({
  vaultEmail,
  isActive,
  recentEmails,
}: ConnectionsContentProps) {
  const [copied, setCopied] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testFrom, setTestFrom] = useState('notifications@jbwere.com.au');
  const [testSubject, setTestSubject] = useState('Trade Confirmation - BHP Group Limited');
  const [testBody, setTestBody] = useState(`Dear Client,

Your trade has been executed as follows:

Transaction: BUY
Security: BHP Group Limited (BHP.AX)
Quantity: 500
Price: $43.25 AUD
Total Value: $21,625.00 AUD
Settlement Date: 2026-03-15

Account: Wealth Management Portfolio
Custodian: JBWere

This is an automatically generated confirmation.`);
  const [testing, setTesting] = useState(false);
  const router = useRouter();

  function copyEmail() {
    navigator.clipboard.writeText(vaultEmail);
    setCopied(true);
    toast.success('Vault email copied');
    setTimeout(() => setCopied(false), 2000);
  }

  async function runTest() {
    setTesting(true);
    try {
      const res = await fetch('/api/ingest/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: vaultEmail,
          from: testFrom,
          subject: testSubject,
          text: testBody,
          messageId: `test-${Date.now()}`,
        }),
      });

      const json = await res.json() as { message?: string; extracted?: number; error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? 'Test failed');
      }

      toast.success(json.message ?? `Extracted ${json.extracted} items`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Connections
        </h1>
        <p className="text-white/25 text-sm mt-1">
          Keep your portfolio up to date with automatic email forwarding
        </p>
      </div>

      <Card className="border-white/[0.06] bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="text-xs font-medium text-white/30 tracking-widest uppercase">
            Your Vault Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
              <Mail className="size-4 text-white/20 shrink-0" />
              <span className="text-sm text-white/60 font-mono select-all">{vaultEmail}</span>
              {isActive && (
                <span className="ml-auto text-[10px] text-emerald-400/60 uppercase tracking-widest">Active</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyEmail}
              className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5 shrink-0"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>

          <div className="rounded-md bg-white/[0.015] border border-white/[0.04] p-4 space-y-3">
            <p className="text-xs text-white/40 font-medium">How it works</p>
            <ol className="text-xs text-white/30 space-y-2 list-decimal list-inside">
              <li>Copy the vault email address above</li>
              <li>In your email app (Gmail, Outlook), create an auto-forward rule:</li>
              <li className="pl-4 list-none text-white/20">
                <span className="text-white/30">Filter:</span> From contains your bank&apos;s domain
                <span className="text-white/15"> (e.g. @ubs.com, @jbwere.com.au)</span>
              </li>
              <li className="pl-4 list-none text-white/20">
                <span className="text-white/30">Action:</span> Forward to your vault email
              </li>
              <li>Every trade confirmation, dividend notice, and statement will be automatically parsed and your portfolio updated</li>
            </ol>
          </div>

          <p className="text-[11px] text-white/15">
            Your vault email is unique to your account. Emails sent to this address are processed by AI to extract
            portfolio data. No passwords or bank credentials are stored.
          </p>

          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTest(!showTest)}
              className="text-white/20 hover:text-white/40 hover:bg-white/5 text-xs"
            >
              <FlaskConical className="size-3 mr-1.5" />
              {showTest ? 'Hide Test Panel' : 'Test with a fake email'}
            </Button>
          </div>

          {showTest && (
            <div className="rounded-md bg-white/[0.015] border border-white/[0.04] p-4 space-y-3">
              <p className="text-xs text-white/30 font-medium">Simulate a forwarded bank email</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-white/20 mb-1">From</label>
                  <input
                    value={testFrom}
                    onChange={(e) => setTestFrom(e.target.value)}
                    className="w-full rounded-md bg-white/[0.02] border border-white/[0.06] px-2.5 py-1.5 text-xs text-white/50 focus:outline-none focus:ring-1 focus:ring-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/20 mb-1">Subject</label>
                  <input
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                    className="w-full rounded-md bg-white/[0.02] border border-white/[0.06] px-2.5 py-1.5 text-xs text-white/50 focus:outline-none focus:ring-1 focus:ring-white/10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/20 mb-1">Email Body</label>
                <textarea
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  rows={8}
                  className="w-full rounded-md bg-white/[0.02] border border-white/[0.06] px-2.5 py-1.5 text-xs text-white/50 font-mono focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={runTest}
                disabled={testing}
                className="border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5 w-full"
              >
                {testing ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FlaskConical className="size-3.5 mr-1.5" />
                )}
                {testing ? 'Parsing with Claude...' : 'Send Test Email'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {recentEmails.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-white/30 tracking-widest uppercase mb-4">
            Recent Ingested Emails
          </h2>
          <div className="space-y-1">
            {recentEmails.map((email) => (
              <div
                key={email.id}
                className="flex items-center justify-between rounded-md px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/40 truncate">
                    {email.subject ?? 'No subject'}
                  </p>
                  <p className="text-xs text-white/15 truncate">
                    {email.from_address ?? 'Unknown sender'}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  {email.holdings_extracted > 0 && (
                    <span className="text-xs text-white/20 font-mono">
                      {email.holdings_extracted} items
                    </span>
                  )}
                  <span className={`text-[10px] uppercase tracking-widest ${statusColors[email.status] ?? 'text-white/20'}`}>
                    {email.status}
                  </span>
                  <span className="text-xs text-white/15 font-mono">
                    {new Date(email.received_at).toLocaleDateString('en-AU', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
