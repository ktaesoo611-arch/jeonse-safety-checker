-- Add building_type column to properties table
-- Persists the detected building type so downstream analysis routes
-- don't need to re-detect it (which can fail with incomplete addresses)

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS building_type TEXT DEFAULT NULL;

COMMENT ON COLUMN properties.building_type IS 'Detected building type: apartment, multifamily, officetel';
