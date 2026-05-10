-- Migration to add start_date and end_date to ads_campaigns table
ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update existing records to have a start_date if they don't have one
UPDATE ads_campaigns SET start_date = CURRENT_DATE WHERE start_date IS NULL;
