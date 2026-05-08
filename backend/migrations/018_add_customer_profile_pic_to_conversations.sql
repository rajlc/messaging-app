-- Add customer_profile_pic column to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_profile_pic TEXT;

-- Add customer_profile_pic column to post_comments table
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS customer_profile_pic TEXT;
