-- Update check constraint for order_status to include 'Arrived at Branch'
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_status_check') THEN
        ALTER TABLE orders DROP CONSTRAINT orders_order_status_check;
        ALTER TABLE orders ADD CONSTRAINT orders_order_status_check CHECK (order_status IN (
            'New Order', 'Confirmed Order', 'Ready to Ship', 'Shipped', 'Delivered', 'Cancelled', 'Follow up again', 
            'Arrived', 'Returning to Seller', 'Fail Delivered', 'Pickup Cancel', 'On Hold', 'Partial Delivery',
            'Delivery Process', 'Return Process', 'Return Delivered', 'Arrived at Branch', 'Packed'
        ));
    END IF;
END $$;
