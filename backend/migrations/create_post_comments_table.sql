-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id VARCHAR(255) NOT NULL UNIQUE,
  post_id VARCHAR(255) NOT NULL,
  post_message TEXT,
  customer_id VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  comment_text TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL DEFAULT 'facebook',
  page_id VARCHAR(255),
  is_hidden BOOLEAN DEFAULT FALSE,
  is_replied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_comments_customer_id ON post_comments(customer_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_comment_id ON post_comments(comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON post_comments(created_at DESC);
