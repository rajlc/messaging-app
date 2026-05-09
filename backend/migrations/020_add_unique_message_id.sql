-- Add UNIQUE constraint to message_id in messages table to prevent duplication
-- First, remove any existing duplicates (keep the one with metadata if possible)
DELETE FROM messages a USING (
    SELECT MIN(ctid) as ctid, message_id
    FROM messages
    WHERE message_id IS NOT NULL
    GROUP BY message_id
    HAVING COUNT(*) > 1
) b
WHERE a.message_id = b.message_id
AND a.ctid <> b.ctid;

-- Now add the constraint
ALTER TABLE messages
ADD CONSTRAINT messages_message_id_key UNIQUE (message_id);
