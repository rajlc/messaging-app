-- Add status_reason column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Update check constraint for order_status if it exists to include new Pathao statuses
-- We might need to drop and recreate constraint if it's strict enum-like check
-- For now, let's assume it's TEXT or we append common ones.
-- The user asked to "set" if not set.
-- Let's check existing constraint first or just add the column for now.
-- If we need to add statuses:
-- ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'Pickup Cancel'; -- if it's enum
-- OR drop constraint
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_status_check') THEN
        ALTER TABLE orders DROP CONSTRAINT orders_order_status_check;
        ALTER TABLE orders ADD CONSTRAINT orders_order_status_check CHECK (order_status IN (
            'New Order', 'Confirmed Order', 'Ready to Ship', 'Shipped', 'Delivered', 'Cancelled', 'Follow up again', 
            'Arrived', 'Returning to Seller', 'Fail Delivered', 'Pickup Cancel', 'On Hold', 'Partial Delivery'
        ));
    END IF;
END $$;
