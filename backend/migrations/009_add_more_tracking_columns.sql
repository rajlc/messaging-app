-- Migration: Add additional tracking columns to orders table
-- Description: Add columns to track who and when specific status changes occurred

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS arrived_at_branch_by TEXT,
ADD COLUMN IF NOT EXISTS arrived_at_branch_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_by TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS packed_by TEXT,
ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;
