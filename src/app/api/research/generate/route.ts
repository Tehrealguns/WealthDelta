import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { maskPII } from '@/lib/pii-masker';
import { formatCurrency } from '@/lib/decimal';
import type { HoldingRow, DailySnapshotRow } from '@/lib/types';

const RESEARCH_SYSTEM = `You are a senior wealth research analyst producing a comprehensive portfolio research report for an ultra-high-net-worth client. Write with the authority and depth of a Goldman Sachs or UBS research report.

Structure your report with these exact sections:

# Executive Summary
A 2-3 paragraph overview of the portfolio's current state, key risks, and primary recommendations.

# Portfolio Overview
- Total AUM and composition
- Asset allocation breakdown
- Source diversification analysis

# Market Context
- Relevant macro-economic conditions
- Sector-specific trends affecting the portfolio
- Currency and interest rate considerations

# Position Analysis
For each major holding or cluster of holdings:
- Current valuation and weight
- Performance drivers
- Risk assessment
- Outlook

# Risk Assessment
- Concentration risk analysis
- Currency exposure
- Liquidity risk
- Correlation analysis between positions

# Recommendations
- Specific, actionable suggestions with rationale
- Rebalancing opportunities
- Tax-loss harvesting candidates
- New position opportunities

# Appendix
- Key assumptions
- Data sources and limitations

Write approximately 2000-3000 words. Use professional financial language. Format all currency values consistently.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = userData.user.id;
  const body = (await request.json()) as { focusAreas?: string };

  const { data: holdings } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId) as { data: HoldingRow[] | null };

  const { data: snapshots } = await supabase
    .from('daily_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(30) as { data: DailySnapshotRow[] | null };

  if (!holdings?.length) {
    return NextResponse.json(
      { error: 'No holdings found', details: 'Add holdings first' },
      { status: 404 },
    );
  }

  const portfolioData = `
PORTFOLIO HOLDINGS:
${holdings.map((h) => `- ${h.asset_name} | ${h.source} | ${h.asset_class} | ${formatCurrency(h.valuation_base)}${h.ticker_symbol ? ` [${h.ticker_symbol}]` : ''}`).join('\n')}

RECENT SNAPSHOTS (up to 30 days):
${(snapshots ?? []).map((s) => `- ${s.snapshot_date}: ${formatCurrency(s.total_value)}${s.delta_pct != null ? ` (${s.delta_pct > 0 ? '+' : ''}${s.delta_pct.toFixed(2)}%)` : ''}`).join('\n')}
${body.focusAreas ? `\nCLIENT FOCUS AREAS:\n${body.focusAreas}` : ''}
`;

  const maskedData = maskPII(portfolioData);

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (err) {
    return NextResponse.json(
      { error: 'AI not configured', details: err instanceof Error ? err.message : 'Set ANTHROPIC_API_KEY' },
      { status: 500 },
    );
  }

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 8192,
    system: RESEARCH_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Generate a comprehensive research report for this portfolio:\n\n${maskedData}`,
      },
    ],
  });

  const reportText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => ('text' in b ? b.text : ''))
    .join('');

  return NextResponse.json({
    message: 'Research report generated',
    report: reportText,
    tokens: {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
    },
  });
}
