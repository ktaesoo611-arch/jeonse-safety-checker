-- Add tiered expected rent columns for 연립/다세대 multifamily properties
-- These columns store the expected rent calculated for each quality tier

ALTER TABLE wolse_price_data
ADD COLUMN IF NOT EXISTS tiered_expected_rent JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS selected_tier_expected_rent NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS filtered_transactions JSONB DEFAULT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN wolse_price_data.tiered_expected_rent IS 'Array of tiered expected rent values for multifamily properties (budget/standard/mid/premium)';
COMMENT ON COLUMN wolse_price_data.selected_tier_expected_rent IS 'Expected rent for the user-selected quality tier';
COMMENT ON COLUMN wolse_price_data.filtered_transactions IS 'Filtered transactions used for tiered calculation (floor/age filtered) for scatter plot';
