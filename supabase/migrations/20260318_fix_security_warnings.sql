-- =============================================================================
-- Migration: Fix Supabase Security Advisor Warnings
-- Date: 2026-03-18
--
-- Fixes:
--   Issue 1 (WARN): Function search_path mutable on update_updated_at_column
--   Issue 2 (WARN): Permissive INSERT policy on beta_email_captures (role=-)
--   Issue 3 (WARN): Permissive UPDATE policy on beta_settings (role=-)
--   Issue 4 (WARN): Leaked password protection — manual dashboard setting
--   Issues 5-6 (INFO): RLS enabled with no policies on cache tables — intentional
--
-- Code changes (applied separately):
--   - beta/unlock route: switched from createServerSupabaseClient to createServiceRoleClient
--   - beta/counter route: switched from createServerSupabaseClient to createServiceRoleClient
--   This allows removing permissive anon policies since service_role bypasses RLS.
-- =============================================================================

BEGIN;

-- =============================================================================
-- Issue 1: Fix mutable search_path on trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- Issue 2: Remove overly permissive INSERT policy on beta_email_captures
--
-- Previously: FOR INSERT WITH CHECK (true) for ALL roles (including anon)
-- Now: No INSERT policy needed — beta/unlock route uses service_role (bypasses RLS)
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can insert email captures" ON public.beta_email_captures;

-- =============================================================================
-- Issue 3: Remove overly permissive UPDATE policy on beta_settings
--
-- Previously: FOR UPDATE USING (true) for ALL roles — named "service role" but
-- actually granted UPDATE to anon/authenticated too.
-- Now: No UPDATE policy needed — beta/unlock route uses service_role (bypasses RLS)
--
-- Keep the existing SELECT policy ("Anyone can read beta settings") since
-- the counter endpoint is public info (how many free unlocks remain).
-- =============================================================================
DROP POLICY IF EXISTS "Service role can update beta settings" ON public.beta_settings;

COMMIT;
