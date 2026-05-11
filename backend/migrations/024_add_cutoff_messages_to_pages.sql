-- Add cutoff_messages column to pages table
ALTER TABLE pages
ADD COLUMN IF NOT EXISTS cutoff_messages TEXT;

COMMENT ON COLUMN pages.cutoff_messages IS 'List of messages that, if received exactly, will prevent the AI from replying.';
