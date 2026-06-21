-- Add invoice_printed column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_printed BOOLEAN DEFAULT FALSE;
