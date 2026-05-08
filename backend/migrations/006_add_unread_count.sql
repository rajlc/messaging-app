-- Add unread_count column to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;

-- Update existing rows to have 0 unread messages
UPDATE conversations SET unread_count = 0 WHERE unread_count IS NULL;

-- Function to increment unread count and update last message
CREATE OR REPLACE FUNCTION increment_unread_count(conv_id UUID, is_customer BOOLEAN, last_msg TEXT)
RETURNS void AS $$
BEGIN
    IF is_customer THEN
        UPDATE conversations 
        SET 
            unread_count = unread_count + 1,
            last_message = last_msg,
            last_message_at = NOW(),
            updated_at = NOW()
        WHERE id = conv_id;
    ELSE
        UPDATE conversations 
        SET 
            last_message = last_msg,
            last_message_at = NOW(),
            updated_at = NOW()
        WHERE id = conv_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
