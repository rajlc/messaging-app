
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
    console.log('Attempting to create bucket: chat-attachments');

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError);
    } else {
        const exists = buckets && buckets.find(b => b.name === 'chat-attachments');
        if (exists) {
            console.log('Bucket "chat-attachments" already exists.');
            return;
        }
    }

    // Create bucket
    const { data, error } = await supabase.storage.createBucket('chat-attachments', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif']
    });

    if (error) {
        console.error('Error creating bucket:', error);
    } else {
        console.log('Bucket "chat-attachments" created successfully:', data);
    }
}

createBucket();
