-- Create message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL UNIQUE,
  template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookup by status
CREATE INDEX IF NOT EXISTS idx_message_templates_status ON message_templates(status);

-- Insert default templates for common statuses
INSERT INTO message_templates (status, template) VALUES
('New Order', 'Hi {{customer_name}}, thank you for your order! Your Order ID is #{{order_number}}. We will process it shortly.'),
('Confirmed Order', 'Hello {{customer_name}}, your order #{{order_number}} has been confirmed! Total amount: Rs. {{total_amount}}.'),
('Delivered', 'Hi {{customer_name}}, your order #{{order_number}} has been delivered. Thank you for shopping with us!'),
('Cancel', 'Hi {{customer_name}}, your order #{{order_number}} has been cancelled. Please contact us if this was a mistake.'),
('Follow up again', 'Hello {{customer_name}}, just following up on your inquiry. Let us know if you need any assistance.'),
('Returned', 'Hi {{customer_name}}, we have received your return for order #{{order_number}}.')
ON CONFLICT (status) DO NOTHING;
