-- Create quick_reply_templates table
CREATE TABLE IF NOT EXISTS quick_reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookup by title
CREATE INDEX IF NOT EXISTS idx_quick_reply_templates_title ON quick_reply_templates(title);

-- Insert sample templates
INSERT INTO quick_reply_templates (title, message) VALUES
('Thank You', 'Thank you for contacting us! We appreciate your interest.'),
('Order Confirmation', 'Your order has been received and is being processed.'),
('Shipping Update', 'Your order is on its way! You''ll receive it soon.'),
('Product Inquiry', 'Thank you for your inquiry. Let me help you with that.'),
('Follow Up', 'Just following up on your previous message. How can we assist you further?')
ON CONFLICT DO NOTHING;
