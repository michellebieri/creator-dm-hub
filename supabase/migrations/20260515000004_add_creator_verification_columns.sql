-- ── LB#1 Fix part 2: columns that never landed in production ────────────────
--
-- Migration 20260512000006 had TWO statements in one transaction:
--   1) ALTER TABLE creator_verifications ADD COLUMN IF NOT EXISTS ...
--   2) CREATE POLICY IF NOT EXISTS "Admins can manage..." (invalid syntax)
--
-- Postgres parses the whole transaction before executing — the parse error
-- on statement (2) aborts statement (1), so the columns were never added.
--
-- Confirmed in production today: submit_creator_application RPC returns
--   42703 — column "instagram_handle" of relation "creator_verifications"
--   does not exist
--
-- Without these columns:
--   - submit_creator_application RPC crashes
--   - Frontend can't display application details in admin panel
--   - Any code path inserting into these columns fails
--
-- Fix: add the missing columns. IF NOT EXISTS is idempotent.

ALTER TABLE public.creator_verifications
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_handle    TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle   TEXT,
  ADD COLUMN IF NOT EXISTS follower_count   TEXT,
  ADD COLUMN IF NOT EXISTS content_niche    TEXT,
  ADD COLUMN IF NOT EXISTS about_yourself   TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes      TEXT;
