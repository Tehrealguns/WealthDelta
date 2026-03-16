export const ASSET_CLASSES = ['Equity', 'Bond', 'Cash', 'Alternative', 'Private Equity'] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export type Source = string;

export interface UnifiedPortfolio {
  asset_id: string;
  source: Source;
  asset_name: string;
  asset_class: AssetClass;
  ticker_symbol: string | null;
  valuation_base: number;
  valuation_date: string;
  is_static: boolean;
}

export interface HoldingRow {
  id: string;
  user_id: string;
  asset_id: string;
  source: Source;
  asset_name: string;
  asset_class: AssetClass;
  ticker_symbol: string | null;
  valuation_base: number;
  valuation_date: string;
  is_static: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailySnapshotRow {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_value: number;
  delta_value: number | null;
  delta_pct: number | null;
  breakdown_json: SnapshotBreakdown | null;
  created_at: string;
}

export interface SnapshotBreakdown {
  by_source: Record<Source, number>;
  by_class: Record<AssetClass, number>;
}
