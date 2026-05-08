-- Add columns for Local Logistics details
ALTER TABLE orders ADD COLUMN IF NOT EXISTS logistic_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_branch TEXT;

-- Note: 'courier_delivery_fee' and 'delivery_charge' already exist and will be used for costs.
-- 'courier_delivery_fee' = Estimated/Actual cost from partner (Local or Pathao)
-- 'delivery_charge' = Amount charged to customer
