-- Add package_description column to orders table if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS package_description TEXT;
