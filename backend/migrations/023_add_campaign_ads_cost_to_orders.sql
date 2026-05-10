-- Add campaign_ads_cost column to orders table to store locked ads cost
ALTER TABLE orders ADD COLUMN IF NOT EXISTS campaign_ads_cost DECIMAL(10, 2);
