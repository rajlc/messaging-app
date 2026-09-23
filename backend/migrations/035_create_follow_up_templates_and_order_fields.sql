-- Migration 035: Create follow_up_templates table and order tracking fields

CREATE TABLE IF NOT EXISTS follow_up_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL UNIQUE,
    instruction TEXT NOT NULL,
    delay_hours INT NOT NULL DEFAULT 8,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default follow-up templates for risk statuses
INSERT INTO follow_up_templates (status, instruction, delay_hours, is_active)
VALUES 
(
    'Delivery Failed',
    'You are a polite customer care agent for our e-commerce store. The courier reported delivery failed for order #{{order_number}} (Product: {{product_name}}, Amount: Rs. {{total_amount}}, Delivery Branch: {{delivery_branch}}). Recent courier remarks: {{courier_remarks}}. First delivery attempt analysis: {{delivery_attempt_summary}}. Explain politely to the customer that our delivery partner attempted delivery but was unsuccessful. Reassure them that their package is safe at the local hub. Ask what time or date they will be available to receive the package, or if they need to update their phone/address so we can request a re-attempt. Keep it warm, polite, and helpful in friendly Nepali/English mix.',
    8,
    TRUE
),
(
    'Hold',
    'You are a helpful customer care agent for our store. Order #{{order_number}} (Product: {{product_name}}, Amount: Rs. {{total_amount}}, Delivery Branch: {{delivery_branch}}) is currently on HOLD at the courier branch. Courier remarks: {{courier_remarks}}. Warmly check with the customer if they asked for it to be held or if they were busy. Offer to coordinate with the local branch to deliver on their preferred day. Keep the response polite and concise.',
    4,
    TRUE
),
(
    'Return Process',
    'You are an urgent care coordinator for our store. Order #{{order_number}} (Product: {{product_name}}, Amount: Rs. {{total_amount}}, Delivery Branch: {{delivery_branch}}) is about to be RETURNED to our warehouse. Courier remarks: {{courier_remarks}}. Urgently and respectfully reach out to the customer. Ask if there was an issue or misunderstanding with the delivery rider. Let them know we can stop the return and deliver it if they still want the order. Encourage them to reply as soon as possible.',
    2,
    TRUE
)
ON CONFLICT (status) DO NOTHING;

-- Add tracking columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_ai_followup_sent_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ai_followup_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_ai_followup_message TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_status_message_sent_at TIMESTAMPTZ;
