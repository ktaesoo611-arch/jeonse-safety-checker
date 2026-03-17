-- =============================================================================
-- Migration: Fix 7 Supabase Security Vulnerabilities
-- Date: 2026-03-18
--
-- Fixes:
--   Lint 0013 (x3): RLS disabled on properties, transaction_cache, building_register_cache
--   Lint 0007 (x1): properties has policies defined but RLS not enabled
--   Lint 0010 (x3): SECURITY DEFINER views: jeonse_safety_full, wolse_price_full, user_analyses_dashboard
--
-- All tables are accessed server-side via service_role (bypasses RLS).
-- These policies protect against direct anon-key access via PostgREST.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. properties — Enable RLS, allow SELECT for everyone, writes via service_role only
-- =============================================================================
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Drop any stale policies from partial schema applications
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;

-- Public reference data: anyone can read property info (address, district, dong)
CREATE POLICY "Properties are viewable by everyone"
  ON public.properties
  FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies for anon/authenticated.
-- All writes go through API routes using service_role (which bypasses RLS).


-- =============================================================================
-- 2. transaction_cache — Enable RLS, no public access (service_role only)
-- =============================================================================
ALTER TABLE public.transaction_cache ENABLE ROW LEVEL SECURITY;

-- No policies needed. This table is a server-side MOLIT API cache.
-- Only accessed by lib/analyzers/property-valuation.ts via supabaseAdmin (service_role).
-- Anon/authenticated users have zero reason to access this directly.


-- =============================================================================
-- 3. building_register_cache — Enable RLS, no public access (service_role only)
-- =============================================================================
ALTER TABLE public.building_register_cache ENABLE ROW LEVEL SECURITY;

-- No policies needed. Server-side cache for building registry API data.
-- Currently unused in production but securing it preemptively.


-- =============================================================================
-- 4-6. Fix SECURITY DEFINER views → SECURITY INVOKER
--
-- These views join tables with proper RLS (analyses, jeonse_safety_data, etc.)
-- but as SECURITY DEFINER they run as the view owner (postgres), bypassing all RLS.
-- Changing to SECURITY INVOKER makes them respect the caller's RLS policies.
--
-- Impact: Server-side code uses service_role (bypasses RLS) — unaffected.
--         Anon PostgREST access will now only see rows allowed by underlying table RLS.
-- =============================================================================

ALTER VIEW public.jeonse_safety_full SET (security_invoker = true);
ALTER VIEW public.wolse_price_full SET (security_invoker = true);
ALTER VIEW public.user_analyses_dashboard SET (security_invoker = true);

COMMIT;
