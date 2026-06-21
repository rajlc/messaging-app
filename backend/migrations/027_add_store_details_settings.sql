-- Ensure settings table has the key-value store detail settings populated
INSERT INTO settings (key, value)
VALUES 
    ('store_name', ''),
    ('store_location', ''),
    ('contact_number', '')
ON CONFLICT (key) DO NOTHING;
