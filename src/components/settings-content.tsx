'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Mail, FileText, Clock, Target, Eye } from 'lucide-react';

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { value: `${h}:00`, label: `${h}:00` };
});

const FOCUS_PRESETS = [
  'Gold & Precious Metals',
  'Oil & Energy',
  'Cryptocurrency',
  'Foreign Exchange (FX)',
  'Equities & Stocks',
  'Bonds & Fixed Income',
  'Interest Rates',
  'Dividends',
  'Real Estate / REITs',
  'Geopolitical Risk',
];

interface Settings {
  custom_instructions: string;
  watch_items: string;
  email_enabled: boolean;
  email_time: string;
  include_pdf: boolean;
  email_days: string;
  focus_areas: string;
  pdf_days: string;
}

const DEFAULTS: Settings = {
  custom_instructions: '',
  watch_items: '',
  email_enabled: true,
  email_time: '07:00',
  include_pdf: true,
  email_days: 'mon,tue,wed,thu,fri',
  focus_areas: '',
  pdf_days: '',
};

export function SettingsContent() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setSettings({ ...DEFAULTS, ...d.settings });
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setDirty(true);
  }

  function parseDays(csv: string): Set<string> {
    return new Set(csv.split(',').map((d) => d.trim()).filter(Boolean));
  }

  function toggleDay(field: 'email_days' | 'pdf_days', day: string) {
    const current = parseDays(settings[field]);
    if (current.has(day)) current.delete(day);
    else current.add(day);
    const ordered = DAYS.map((d) => d.key).filter((d) => current.has(d));
    update(field, ordered.join(','));
  }

  function parseFocus(): string[] {
    return settings.focus_areas.split(',').map((s) => s.trim()).filter(Boolean);
  }

  function toggleFocus(area: string) {
    const current = parseFocus();
    const idx = current.indexOf(area);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(area);
    update('focus_areas', current.join(','));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Save failed');
      toast.success('Settings saved');
      setDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-white/30" />
      </div>
    );
  }

  const emailDays = parseDays(settings.email_days);
  const pdfDays = parseDays(settings.pdf_days);
  const focusAreas = parseFocus();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
          <p className="mt-1 text-sm text-white/35">Configure your daily briefings and email schedule</p>
        </div>
        <Button
          onClick={save}
          disabled={saving || !dirty}
          className="bg-white text-black hover:bg-white/90 font-medium"
        >
          {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Email Schedule */}
      <Section icon={<Mail className="size-4" />} title="Email Schedule">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">Daily briefing emails</p>
              <p className="text-xs text-white/30 mt-0.5">Receive an AI-generated portfolio summary</p>
            </div>
            <button
              onClick={() => update('email_enabled', !settings.email_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.email_enabled ? 'bg-emerald-500/70' : 'bg-white/10'
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full bg-white transition-transform ${
                  settings.email_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.email_enabled && (
            <>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 block">
                  Which days
                </label>
                <div className="flex gap-1.5">
                  {DAYS.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => toggleDay('email_days', d.key)}
                      className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                        emailDays.has(d.key)
                          ? 'bg-white/10 text-white border border-white/15'
                          : 'bg-white/[0.03] text-white/25 border border-white/[0.06] hover:border-white/10 hover:text-white/40'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => update('email_days', 'mon,tue,wed,thu,fri')}
                    className="text-[11px] text-white/25 hover:text-white/50 transition-colors"
                  >
                    Weekdays
                  </button>
                  <span className="text-white/10">|</span>
                  <button
                    onClick={() => update('email_days', 'mon,tue,wed,thu,fri,sat,sun')}
                    className="text-[11px] text-white/25 hover:text-white/50 transition-colors"
                  >
                    Every day
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 block">
                  Delivery time (AEST)
                </label>
                <select
                  value={settings.email_time}
                  onChange={(e) => update('email_time', e.target.value)}
                  className="w-full max-w-[180px] rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value} className="bg-[#0a0a0a]">
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </Section>

      {/* PDF Reports */}
      <Section icon={<FileText className="size-4" />} title="PDF Research Reports">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">Attach PDF reports</p>
              <p className="text-xs text-white/30 mt-0.5">Full research report attached to your briefing email</p>
            </div>
            <button
              onClick={() => update('include_pdf', !settings.include_pdf)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.include_pdf ? 'bg-emerald-500/70' : 'bg-white/10'
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full bg-white transition-transform ${
                  settings.include_pdf ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.include_pdf && (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 block">
                PDF on specific days (leave empty for every email day)
              </label>
              <div className="flex gap-1.5">
                {DAYS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => toggleDay('pdf_days', d.key)}
                    className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                      pdfDays.has(d.key)
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-white/[0.03] text-white/25 border border-white/[0.06] hover:border-white/10 hover:text-white/40'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-white/20">
                {pdfDays.size === 0
                  ? 'PDF attached to every scheduled email'
                  : `PDF attached on: ${Array.from(pdfDays).map((d) => DAYS.find((x) => x.key === d)?.label).join(', ')}`}
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Focus Areas */}
      <Section icon={<Target className="size-4" />} title="Briefing Focus">
        <div className="space-y-5">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 block">
              What should the AI prioritize in your briefing?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FOCUS_PRESETS.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleFocus(area)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    focusAreas.includes(area)
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:border-white/10 hover:text-white/50'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 block">
              Watch list (specific tickers, commodities, indices)
            </label>
            <Input
              value={settings.watch_items}
              onChange={(e) => update('watch_items', e.target.value)}
              placeholder="e.g. BHP.AX, XAU, BTC-USD, CL=F, AUD/USD, ^AXJO"
              className="border-white/10 bg-white/[0.06] text-white placeholder:text-white/25 focus:border-white/20"
            />
            <p className="mt-1.5 text-[11px] text-white/20">
              Comma-separated. The AI will always include these in your daily briefing.
            </p>
          </div>
        </div>
      </Section>

      {/* Custom Instructions */}
      <Section icon={<Eye className="size-4" />} title="Custom Instructions">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 block">
              Additional instructions for the AI
            </label>
            <textarea
              value={settings.custom_instructions}
              onChange={(e) => update('custom_instructions', e.target.value)}
              placeholder="e.g. Always compare my AUD holdings against USD equivalent. Flag any single position over 15% of portfolio. Write in Australian English."
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/20 focus:outline-none resize-none"
            />
          </div>
        </div>
      </Section>

      {/* Delivery Time Preview */}
      <Section icon={<Clock className="size-4" />} title="Schedule Preview">
        <div className="space-y-2">
          {DAYS.map((d) => {
            const hasEmail = emailDays.has(d.key);
            const hasPdf = settings.include_pdf && (pdfDays.size === 0 ? hasEmail : pdfDays.has(d.key));
            return (
              <div
                key={d.key}
                className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${
                  hasEmail ? 'bg-white/[0.04]' : 'opacity-30'
                }`}
              >
                <span className="text-sm text-white/60 font-medium w-28">{
                  { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }[d.key]
                }</span>
                <div className="flex items-center gap-3">
                  {hasEmail ? (
                    <>
                      <span className="text-xs text-white/30">{settings.email_time} AEST</span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        Email
                      </span>
                      {hasPdf && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                          PDF
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-white/15">No email</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Bottom save */}
      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-white text-black hover:bg-white/90 font-medium shadow-lg shadow-black/50"
          >
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="text-white/40">{icon}</div>
        <h2 className="text-sm font-semibold tracking-tight text-white/70 uppercase">{title}</h2>
      </div>
      {children}
    </div>
  );
}
