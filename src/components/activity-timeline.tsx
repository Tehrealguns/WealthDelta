'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/decimal';
import {
  Camera,
  Mail,
  FileText,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import type { DailySnapshotRow } from '@/lib/types';

interface BriefingEvent {
  id: string;
  briefing_date: string;
  summary_text: string;
  model: string | null;
  created_at: string;
}

interface IngestedEmailEvent {
  id: string;
  from_address: string;
  subject: string;
  holdings_extracted: number;
  created_at: string;
}

type TimelineEvent =
  | { type: 'snapshot'; date: string; data: DailySnapshotRow }
  | { type: 'briefing'; date: string; data: BriefingEvent }
  | { type: 'email'; date: string; data: IngestedEmailEvent };

type EventFilter = 'all' | 'snapshot' | 'briefing' | 'email';

interface ActivityTimelineProps {
  snapshots: DailySnapshotRow[];
  briefings: BriefingEvent[];
  ingestedEmails: IngestedEmailEvent[];
}

export function ActivityTimeline({
  snapshots,
  briefings,
  ingestedEmails,
}: ActivityTimelineProps) {
  const [filter, setFilter] = useState<EventFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const events = useMemo(() => {
    const all: TimelineEvent[] = [
      ...snapshots.map((s) => ({
        type: 'snapshot' as const,
        date: s.snapshot_date,
        data: s,
      })),
      ...briefings.map((b) => ({
        type: 'briefing' as const,
        date: b.briefing_date,
        data: b,
      })),
      ...ingestedEmails.map((e) => ({
        type: 'email' as const,
        date: e.created_at.split('T')[0],
        data: e,
      })),
    ];

    const filtered = filter === 'all' ? all : all.filter((e) => e.type === filter);
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [snapshots, briefings, ingestedEmails, filter]);

  const FILTERS: { value: EventFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'snapshot', label: 'Snapshots' },
    { value: 'briefing', label: 'Briefings' },
    { value: 'email', label: 'Emails' },
  ];

  function getIcon(type: TimelineEvent['type']) {
    switch (type) {
      case 'snapshot':
        return <Camera className="size-3.5" />;
      case 'briefing':
        return <FileText className="size-3.5" />;
      case 'email':
        return <Mail className="size-3.5" />;
    }
  }

  function getAccent(type: TimelineEvent['type']) {
    switch (type) {
      case 'snapshot':
        return 'border-emerald-500/30 text-emerald-400/70';
      case 'briefing':
        return 'border-blue-500/30 text-blue-400/70';
      case 'email':
        return 'border-purple-500/30 text-purple-400/70';
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Activity
          </h1>
          <p className="text-white/25 text-sm mt-1">
            {events.length} events
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Filter className="size-3.5 text-white/20 mr-2" />
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                filter === f.value
                  ? 'bg-white/10 text-white/70'
                  : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-white/25 uppercase tracking-widest mb-2">Snapshots</p>
            <p className="text-2xl font-semibold text-white tracking-tight">{snapshots.length}</p>
          </CardContent>
        </Card>
        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-white/25 uppercase tracking-widest mb-2">Briefings Sent</p>
            <p className="text-2xl font-semibold text-white tracking-tight">{briefings.length}</p>
          </CardContent>
        </Card>
        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-white/25 uppercase tracking-widest mb-2">Emails Ingested</p>
            <p className="text-2xl font-semibold text-white tracking-tight">{ingestedEmails.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {events.length === 0 ? (
        <Card className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <p className="text-white/25 text-sm">No activity yet. Generate a snapshot or briefing to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map((event, i) => {
            const key = `${event.type}-${event.date}-${i}`;
            const expanded = expandedId === key;

            return (
              <Card key={key} className="border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm">
                <button
                  onClick={() => setExpandedId(expanded ? null : key)}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <div className={`size-8 rounded-lg border flex items-center justify-center shrink-0 ${getAccent(event.type)}`}>
                    {getIcon(event.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {event.type === 'snapshot' && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/50">Portfolio Snapshot</span>
                        <span className="text-sm font-mono text-white/30">
                          {formatCurrency(event.data.total_value)}
                        </span>
                        {event.data.delta_pct != null && (
                          <span className={`text-xs font-mono flex items-center gap-1 ${event.data.delta_pct >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
                            {event.data.delta_pct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                            {event.data.delta_pct >= 0 ? '+' : ''}{event.data.delta_pct.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    )}
                    {event.type === 'briefing' && (
                      <div>
                        <span className="text-sm text-white/50">Daily Briefing</span>
                        {event.data.model && (
                          <span className="text-xs text-white/15 ml-2">{event.data.model}</span>
                        )}
                      </div>
                    )}
                    {event.type === 'email' && (
                      <div>
                        <span className="text-sm text-white/50 truncate">
                          Email: {event.data.subject || event.data.from_address}
                        </span>
                        <span className="text-xs text-white/20 ml-2">
                          {event.data.holdings_extracted} holdings
                        </span>
                      </div>
                    )}
                  </div>

                  <span className="text-xs text-white/15 font-mono shrink-0">
                    {new Date(event.date).toLocaleDateString('en-AU', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  {event.type === 'briefing' && (
                    expanded ? (
                      <ChevronUp className="size-3.5 text-white/15 shrink-0" />
                    ) : (
                      <ChevronDown className="size-3.5 text-white/15 shrink-0" />
                    )
                  )}
                </button>

                {expanded && event.type === 'briefing' && (
                  <CardContent className="pt-0 pb-4 border-t border-white/[0.04]">
                    <div className="text-sm text-white/35 leading-relaxed whitespace-pre-wrap font-[family-name:var(--font-mono)] mt-4 max-h-64 overflow-y-auto">
                      {event.data.summary_text}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
