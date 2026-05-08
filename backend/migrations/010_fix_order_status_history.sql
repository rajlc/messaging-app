-- Migration: Add remarks column to order_status_history table
-- Description: Add remarks column to track detailed status change information

ALTER TABLE order_status_history
ADD COLUMN IF NOT EXISTS remarks TEXT;
