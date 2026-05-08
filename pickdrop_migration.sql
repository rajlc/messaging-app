-- Pick & Drop Integration: Add new columns to orders table
-- Run this in the Supabase SQL editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickdrop_order_id TEXT,
  ADD COLUMN IF NOT EXISTS pickdrop_tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS pickdrop_destination_branch TEXT,
  ADD COLUMN IF NOT EXISTS pickdrop_city_area TEXT;
