-- Drop old policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;

-- Policy to allow anyone (anon and authenticated) to view files in the chat-attachments bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'chat-attachments');

-- Policy to allow anyone (anon and authenticated) to upload files to the chat-attachments bucket
CREATE POLICY "Public Upload" 
ON storage.objects FOR INSERT 
TO public
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow users to delete their own uploads or just all for now if testing
CREATE POLICY "Public Delete" 
ON storage.objects FOR DELETE 
TO public
USING (bucket_id = 'chat-attachments');
