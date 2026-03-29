-- Expand asset_class constraint to match application types (Commodity, Cryptocurrency, Currency)
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS holdings_asset_class_check;
ALTER TABLE public.holdings ADD CONSTRAINT holdings_asset_class_check
  CHECK (asset_class IN ('Equity','Bond','Cash','Alternative','Private Equity','Commodity','Cryptocurrency','Currency'));
