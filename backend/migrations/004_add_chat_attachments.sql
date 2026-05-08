-- Add image_url and file_type to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'text';

-- Attempt to create the storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to view files in this bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat-attachments');

-- Policy to allow authenticated users to upload files to this bucket
-- Adjust 'auth.role() = ''authenticated''' based on your actual auth needs (e.g., if you use anon key for now)
CREATE POLICY "Public Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chat-attachments');
