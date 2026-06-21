import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addRule() {
    console.log('Adding typo keyword auto-reply rule...');
    const { error } = await supabase.from('auto_reply_rules').insert([
        {
            page_id: 'facebook_marketplace',
            trigger_type: 'keyword',
            trigger_text: 'avaliable',
            reply_text: 'Yes! It is available. Please send your phone number and address to place an order.',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ]);
    if (error) {
        console.error('Error adding rule:', error);
    } else {
        console.log('Typo keyword rule added successfully!');
    }
}

addRule();
